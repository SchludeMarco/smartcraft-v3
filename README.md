# Sm@rtCraft 3.0 – Der Kollege in der Hosentasche

KI-Assistent für Handwerker auf der Baustelle: Installationen, Feuchtigkeitsschäden, Risse,
Bauteile. Langfristig ein multimodaler Assistent für **Smartphone und AR-Brillen**: Bauteile
werden im Sichtfeld erkannt und beschriftet, Prüfschritte und technische Informationen
erscheinen direkt an der Installation. Entwickelt wird Smartphone-first; Analyse- und
Sicherheitslogik sind von Anfang an geräteunabhängig (siehe
[AR-Ausbaustufe](docs/06-ar-ausbaustufe.md)).

**Status:** MVP-Schritte 1–10 umgesetzt; KI: Gemini wie in V2 (Mock als Standard lokal).
V3 ist eine **Weiterentwicklung von Sm@rtCraft V2**: gleicher Ablauf, gleiche Bedienung und
Optik, neuer Unterbau (siehe [ADR 0012](docs/adr/0012-v2-konzept-beibehalten.md)).

## Ablauf wie in V2

1. **Beruf auswählen** (wird gemerkt, App-Farbe folgt dem Beruf)
2. **Problem dokumentieren & analysieren** – bis zu 5 Fotos und/oder eine Beschreibung
3. **Ergebnis der KI-Analyse** – „Lösung und Diagnose“ mit schrittweiser Lösung, dazu
   Sicherheitsblock, Unsicherheiten, nächste Prüfschritte (abhakbar) und Bauteil-Markierungen
4. **KI-Werkzeuge** wie V2: Materialliste, Sicherheits-Check, Kostenschätzung, Kundenbericht
   und je Beruf zwei Spezial-Tools (auch ohne Analyse nutzbar)
5. **Weitergeben** wie V2: Als PDF exportieren, Teilen (WhatsApp, Telegram, E-Mail …),
   Lokal speichern; **Verlauf** über die Kopfleiste
6. Optional: Analyse einem Projekt zuordnen, Projektbericht

> Sm@rtCraft erteilt **keine** Sicherheitsfreigaben. Bei elektrischen Installationen weist
> jede Analyse Risiken, Unsicherheiten und die Pflicht zur Prüfung durch eine
> Elektrofachkraft aus.

## Online-Demo (Vercel)

Projekt `smartcraft-v3` im Vercel-Team von Marco; jeder Push auf `main` wird automatisch
veröffentlicht. **Nur nach Vercel-Login erreichbar.** Demo-Betrieb: Mock-KI, Daten in
flüchtigem Speicher – Projekte und Fotos können jederzeit verschwinden (ADR 0007).

## Dokumentation

- [01 – Analyse V2](docs/01-v2-analyse.md)
- [02 – Architektur V3](docs/02-architektur.md)
- [03 – Projektstruktur](docs/03-projektstruktur.md)
- [04 – MVP-Plan](docs/04-mvp-plan.md)
- [05 – Entscheidungen und Risiken](docs/05-entscheidungen-und-risiken.md)
- [06 – AR-Ausbaustufe](docs/06-ar-ausbaustufe.md)
- [07 – Betrieb und Fehlerübersicht](docs/07-betrieb-und-fehler.md)
- [ADRs](docs/adr/)

## Tech-Stack (geplant)

FastAPI + Pydantic + SQLModel (Backend) · React + TypeScript + Vite + Tailwind (Web) ·
austauschbarer KI-Provider mit Mock als Standard.

## Lokales Setup (Backend)

Voraussetzung: [uv](https://docs.astral.sh/uv/).

```bash
cd apps/api
uv sync
uv run uvicorn --factory smartcraft_api.main:create_app --reload   # http://localhost:8000/docs
uv run pytest && uv run ruff check . && uv run mypy
```

API-Überblick (interaktiv unter `/docs`):

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/health` | Status, Version, KI-Provider |
| POST / GET | `/projects` | Projekt anlegen / auflisten |
| GET / PATCH / DELETE | `/projects/{id}` | Projekt lesen / ändern / endgültig löschen |
| GET | `/projects/{id}/analyses` | Analysen eines Projekts |
| POST | `/analyses` | Analyse wie V2: 0–5 Fotos und/oder Beschreibung (multipart: `trade`, `files`, `note`) |
| GET | `/analyses` | Verlauf: letzte Analysen (`limit`, Standard 20) |
| PATCH | `/analyses/{id}` | Analyse einem Projekt zuordnen (`{"project_id": …}` oder `null`) |
| POST | `/projects/{id}/analyses` | Analyse direkt in einem Projekt (gleiche Felder) |
| GET | `/analyses/{id}` | Analyse mit Ergebnis, Fotos und Prüfschritten |
| GET | `/analyses/{id}/captures/{capture_id}/image` | Bereinigtes Foto (ohne Metadaten) |
| PATCH | `/analyses/{id}/checks/{check_id}` | Prüfschritt dokumentieren (ändert nie das KI-Ergebnis) |
| GET / POST | `/projects/{id}/notes` | Projektnotizen |
| DELETE | `/projects/{id}/notes/{note_id}` | Notiz löschen |
| GET | `/projects/{id}/report` | Projektbericht mit Haftungshinweis |
| GET | `/meta/trades` | Gewerke mit Anzeigenamen |
| GET | `/tools` | KI-Werkzeuge (allgemeine und Berufs-Spezial-Tools) |
| POST | `/tools/{id}` | Werkzeug ausführen (`trade`, optional `analysis_id`, `note`); mit Sicherheitsblock |
| GET | `/analyses/{id}/overlay` | Geräteunabhängige Einblendungs-Sicht (Markierungen, später AR) mit Pflicht-Sicherheitsblock |

Beispiel mit der Mock-KI:

```bash
curl -F trade=elektriker -F 'note=[mock:unterverteilung]' -F files=@foto.jpg \
  http://localhost:8000/analyses
```

Fotos werden vor dem Speichern neu kodiert; EXIF-Daten inkl. GPS-Position fallen dabei weg.

## Lokales Setup (Web)

Voraussetzung: Node.js 22. Backend wie oben auf Port 8000 starten, dann:

```bash
cd apps/web
npm install
npm run dev        # http://localhost:5173 – /api wird an das Backend weitergeleitet
npm test && npm run lint && npm run typecheck
npm run e2e        # Browser-Test des kompletten Ablaufs (startet Backend + Frontend selbst)
```

Nach Änderungen an der API die Typen neu erzeugen:

```bash
cd apps/api && uv run python -m smartcraft_api.openapi_export ../web/openapi.json
cd ../web && npm run gen:api
```

Konfiguration über Umgebungsvariablen, siehe `apps/api/.env.example`. Standard-KI ist ein
kostenloser Mock.
