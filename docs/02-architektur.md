# 02 – Architektur von Sm@rtCraft 3.0

## Leitprinzipien

1. **Der Server besitzt die KI.** Der Client schickt nur Fotos, Kontext und Projekt-ID.
   Prompt, Modell, Ausgabeschema und Sicherheitsregeln liegen ausschließlich im Backend.
2. **Struktur statt Freitext.** Jede Analyse ist ein validiertes JSON-Dokument
   (Pydantic-Schema, versioniert). Das UI rendert Felder, keinen Markdown-Blob.
3. **Beobachtung ≠ Vermutung ≠ Empfehlung.** Das Schema trennt, was sichtbar ist, was
   daraus geschlossen wird, wie sicher das ist und was als Nächstes geprüft werden muss.
4. **Sicherheit wird technisch erzwungen, nicht nur behauptet.** Eine deterministische
   Safety-Policy läuft nach jeder KI-Antwort und kann Antworten verschärfen, aber nie
   entschärfen. Das Schema hat **kein** Feld für eine Freigabe.
5. **KI-Anbieter austauschbar.** Ein Provider-Interface mit `MockProvider` (Standard,
   kostenlos, deterministisch) und später echten Providern. Modellname kommt aus der
   Konfiguration, nie aus dem Code.
6. **Multimodal und AR-fähig von Anfang an.** Eingaben sind „Captures“ (heute Foto, später
   Video-Frame, Audio-Notiz, AR-Brillen-Snapshot). Das Web-Frontend ist einer von mehreren
   gleichrangigen Clients der API; AR-Brillen nutzen dieselbe Analyse- und Sicherheitslogik
   (siehe Abschnitt „Mehrere Clients und AR“ und `06-ar-ausbaustufe.md`).

## Komponenten

```
┌──────────────────────┐     HTTPS/JSON + multipart     ┌──────────────────────────────┐
│  Web-Client (PWA)    │ ─────────────────────────────▶ │  API (FastAPI)               │
│  React + TS + Vite   │                                │  ├─ routes (projects, ...)   │
│  Kamera, Projekte,   │ ◀───────────────────────────── │  ├─ services (Analyse-Flow)  │
│  Ergebnisansicht     │   typisierte Antworten         │  ├─ safety (Policy, Regeln)  │
└──────────────────────┘   (Typen aus OpenAPI)          │  ├─ ai (Provider-Interface)  │
        später:                                         │  │   ├─ MockProvider         │
  AR-Brille / native App ── GET /analyses/{id}/overlay ▶│  │   └─ GeminiProvider (*)   │
                                                        │  ├─ media (Bildpipeline)     │
                                                        │  └─ persistence (SQLModel)   │
                                                        └──────┬───────────────┬───────┘
                                                               │               │
                                                        SQLite (MVP)     Dateiablage lokal
                                                        → Postgres       → Objektspeicher
(*) erst nach ausdrücklicher Freigabe
```

## Analyse-Ablauf (Installation Analyzer)

1. Client verkleinert Foto (max. 1600 px, JPEG) und lädt es zu
   `POST /projects/{id}/analyses` hoch, optional mit Notiz und Domäne.
2. **Media-Pipeline:** Typ/Größe prüfen, EXIF inkl. GPS entfernen, Hash bilden, speichern.
3. **Prompt-Aufbau** aus versionierter Vorlage (`installation_v1`).
4. **Provider-Aufruf** über `AnalysisProvider` (`ai/provider.py`) mit erzwungenem JSON-Schema.
   Ohne Freigabe nur die Mock-KI; ihre Ergebnisse sind als Testdaten gekennzeichnet
   (`source.is_test_data`, ADR 0003).
5. **Schema-Validierung** (Pydantic). Ungültig → ein Reparaturversuch → sonst Status `failed`.
6. **Safety-Policy** (deterministisch, getestet):
   - Elektro erkannt (Domäne oder Bauteile/Beschriftungen wie FI/RCD, LS, NH, 230/400 V)
     → `qualified_person_required = true`, Risikostufe mindestens „hoch“,
     Pflicht-Prüfschritte ergänzen (5 Sicherheitsregeln, Prüfung durch Elektrofachkraft).
   - Formulierungen, die Freigaben suggerieren („ist sicher“, „kann in Betrieb genommen
     werden“, „normgerecht“, „unbedenklich“) → markieren und neutralisieren, Hinweis ergänzen.
   - Unsicherheiten dürfen nie leer sein, wenn die Bildqualität eingeschränkt ist.
   - Fester Haftungshinweis wird serverseitig gesetzt, nicht vom Modell.
7. Ergebnis inkl. `prompt_version`, `model_id`, `policy_version` speichern → Rückgabe.
8. Handwerker kann Notizen ergänzen und Prüfschritte abhaken („erledigt durch Person X“).
   Das ist **Dokumentation durch den Menschen**, keine KI-Freigabe.

## Ergebnisschema (Kurzfassung, v1)

Umgesetzt in `apps/api/smartcraft_api/domain/analysis.py` (`AnalysisDraft` vom Provider,
`AnalysisResult` nach der Policy). Gewerke wie in V2: Klempner (Sanitär/Heizung),
Elektriker, Maler, Tischler/Schreiner, Zimmerer, Mechaniker, Maurer, Dachdecker, Gärtner,
Allround.

```text
AnalysisResult
  schema_version, trade
  summary: str                                                             # neutral, 1–2 Sätze
  image_quality: { usable: bool, issues: [str] }
  components: [{ name, category, location_hint, labels: [{ text, confidence }],
                 region?: { capture_index, x, y, width, height } }]       # 0..1, für Markierungen/AR
  observations: [{ text, confidence: low|medium|high, component_ref? }]   # nur Sichtbares
  findings: [{ title, severity: info|notice|warning|critical,
               reasoning, confidence, component_indices }]                 # Auffälligkeiten
  uncertainties: [str]                                                     # was nicht beurteilbar ist
  next_checks: [{ action, reason, requires_qualified_person: bool,
                  reference?, source, component_indices }]                 # z. B. „DIN VDE 0100-600“
  safety: { risk_level: low|medium|high, hazards: [electrical|gas|structural|
            working_at_height|hazardous_material], qualified_person_required: bool,
            notices: [str], disclaimer: str }                              # disclaimer vom Server
  policy: { version, interventions: [{ rule_id, description }] }           # Protokoll der Policy
```

Bewusst **nicht** enthalten: `approved`, `is_safe`, `compliant`, Reparaturanleitungen.

## Mehrere Clients und AR

Sm@rtCraft ist langfristig ein multimodaler Assistent für Smartphone **und AR-Brillen**
(Details und Ausbaustufen: `06-ar-ausbaustufe.md`, Entscheidung: ADR 0006).

- **Ein Backend, mehrere Clients:** Analyse, Schema und Safety-Policy existieren nur einmal.
  Ein AR-Client bekommt exakt dieselben, bereits geprüften Ergebnisse wie das Smartphone.
- **Positionsdaten:** Bauteile tragen optional eine Region im Foto; Auffälligkeiten und
  Prüfschritte verweisen auf Bauteile. Die Policy verankert Pflicht-Prüfschritte an den
  Bauteilen, an denen sie die Gefahr erkannt hat.
- **Overlay-Schnittstelle:** `GET /analyses/{id}/overlay` liefert eine geräteunabhängige
  Einblendungs-Sicht (Anker + Pflicht-Sicherheitsblock). Smartphone-Markierungen (AR-1) und
  AR-Brillen (AR-3) nutzen dasselbe Format.
- **Keine Bindung an eine Oberfläche:** Die API kennt keine Layouts, Bildschirmgrößen oder
  Gesten. Plattform-spezifisches entsteht ausschließlich im jeweiligen Client.

## Technologieentscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 | Starke Schemas, OpenAPI gratis, gutes KI-Ökosystem, passt zu vorhandener Erfahrung |
| Persistenz | SQLAlchemy 2 + SQLite (MVP), Alembic sobald Schema stabil (ADR 0004) | Kostenlos, lokal, typsicher mit mypy strict, später Postgres ohne Umbau |
| Bilder | Pillow, lokale Ablage hinter Storage-Interface | Kostenlos; später S3-kompatibel |
| Frontend | React 19 + TypeScript + Vite + Tailwind, TanStack Query | V2-Know-how weiter nutzbar, aber typisiert und modular |
| API-Typen | `openapi-typescript` aus dem FastAPI-Schema | Eine Wahrheit für Datenverträge |
| Tests | pytest (Backend), Vitest + Testing Library (Frontend), später Playwright | Safety-Policy wird am stärksten getestet |
| Qualität | ruff, mypy, eslint, prettier, GitHub Actions | Kostenlos für öffentliche Repos |
| Auth | MVP: ohne (lokal, ein Nutzer); vorbereitet über `owner_id` | Kein Mehrwert im lokalen MVP, Entscheidung später |
| KI | `MockProvider` als Standard; echter Provider erst nach Freigabe | Keine Kosten, reproduzierbare Tests |

Architekturentscheidungen werden als ADRs in `docs/adr/` festgehalten.
