# Sm@rtCraft 3.0 – Der Kollege in der Hosentasche

KI-Assistent für Handwerker auf der Baustelle: Installationen, Feuchtigkeitsschäden, Risse,
Bauteile. Langfristig ein multimodaler Assistent für **Smartphone und AR-Brillen**: Bauteile
werden im Sichtfeld erkannt und beschriftet, Prüfschritte und technische Informationen
erscheinen direkt an der Installation. Entwickelt wird Smartphone-first; Analyse- und
Sicherheitslogik sind von Anfang an geräteunabhängig (siehe
[AR-Ausbaustufe](docs/06-ar-ausbaustufe.md)). Die App trägt deshalb das Abzeichen
**„AR-vorbereitet“**: Eine Brille lässt sich als weiterer Client anbinden, sobald eine
ausgewählt ist; die Brillen-Anzeige selbst ist noch nicht gebaut.

**Status:** MVP-Schritte 1–10 umgesetzt; KI: Gemini wie in V2 (Mock als Standard lokal).
V3 ist eine **Weiterentwicklung von Sm@rtCraft V2**: gleicher Ablauf, gleiche Bedienung und
Optik, neuer Unterbau (siehe [ADR 0012](docs/adr/0012-v2-konzept-beibehalten.md)).

## Entstehungsgeschichte

### Die Idee

Bevor Marco Schlude in die KI-Anwendungsentwicklung gewechselt ist, hat er als Zimmermann
gearbeitet. Auf der Baustelle steht man ständig vor Problemen ohne offensichtliche Lösung:
ein Wasserschaden am Balken, ein Riss im Mauerwerk, eine Elektroinstallation, die nicht ins
Konzept passt. Dann ruft man einen Kollegen an, blättert im Fachbuch oder hofft auf den
Verkäufer im Baumarkt. Der Wunsch nach einem Kollegen, der immer dabei ist, besteht seit den
Anfängen des Smartphones – erst leistungsfähige KI-Modelle haben ihn realistisch gemacht.
Sm@rtCraft entstand während der Schulung zum KI-Anwendungsspezialisten.

### V1 – vom Prototyp zur eigenen App (August 2026)

- Der erste Prototyp war ein Export aus Google AI Studio (Canvas): funktional, aber nicht
  eigenständig lauffähig, der API-Schlüssel stand im Browser-Code.
- **10.08.2026 (V1.7.1):** Umzug in ein eigenes Vite/React-Projekt. Gemini läuft seitdem über
  einen Vercel-Proxy, der Schlüssel bleibt auf dem Server; Anmeldung und Daten über Firebase.
- Bis **V1.37.1 (22.08.2026)** wuchs die App um Gewerk-Auswahl, Diagnose, Materialliste,
  Sicherheits-Check, Kundenbericht, PDF-Export und Verlauf.

### V2 – der Kollege in der Hosentasche (22.08.–24.10.2026)

- **22.08.2026 (V2.0.0):** V2 startet als eigenständige Kopie; Berufs-Spezial-Tools sind
  sofort nach der Berufswahl nutzbar, auch ohne Diagnose.
- **27.08.2026 (V2.10.0):** bis zu fünf Fotos pro Analyse.
- **28.08.2026 (V2.18–V2.22):** Offline-Warteschlange (ansehen, bearbeiten, nachholen) und
  Standortabfrage beim ersten Start.
- Absicherung im Betrieb gelernt: Origin-Prüfung, Firebase App Check, Rate-Limit und ein
  Demo-Limit gegen Kostenexplosion durch Missbrauch.
- **22.10.2026 (V2.24.0):** Gästeliste – nur für Familie und Freunde.
- **24.10.2026 (V2.25.0):** versteckter Admin-Zugang; das ist der letzte Stand von V2.

Mit über 130 Versionen von V1.7.1 bis V2.25.0 in elf Wochen war V2 ausgereift in Bedienung und Ablauf. Die Bestandsaufnahme
([docs/01](docs/01-v2-analyse.md)) zeigte aber die Grenzen des Unterbaus: eine einzige
Datei mit rund 4.000 Zeilen, Prompts im Browser, eine Diagnose als reiner Freitext, kein
Projekt- oder Baustellenobjekt und kaum Tests.

### Sm@rtCraft 3.0 – gleiche App, neuer Unterbau (ab 21.11.2026)

Ziel von V3: der bewährte Ablauf von V2 auf einem Fundament, das wachsen kann – bis hin zu
AR-Brillen. Am 21.11.2026 wurde in einem Abend das neue Backend aufgebaut (Schritte 1–10 des
[MVP-Plans](docs/04-mvp-plan.md)). Am 22.11.2026 kam die wichtigste Kurskorrektur: Die
Oberfläche hatte sich zu weit von V2 entfernt. Marcos Vorgabe – „eine Weiterentwicklung von V2
und keine neue App“ – führte zurück zum V2-Konzept ([ADR 0012](docs/adr/0012-v2-konzept-beibehalten.md)):
gleicher Ablauf, gleiche Optik, nur das edlere Lila-Blau zeigt die neue Version.

Was V3 gegenüber V2 grundlegend anders macht:

- **Backend mit Regeln:** Prompts, Ergebnisschema und Sicherheits-Policy liegen versioniert
  auf dem Server, nicht mehr im Browser.
- **Keine Sicherheitsfreigaben:** Jede KI-Antwort läuft durch die Safety-Policy; bei Elektro
  ist immer eine Fachkraft vorgeschrieben, Risiken und Prüfschritte werden ausgewiesen.
- **Projekte und Dokumentation:** Analysen gehören zu Projekten, Prüfschritte sind abhakbar,
  dazu Notizen und Projektbericht; dauerhaft gespeichert in Postgres (Neon).
- **Geprüft:** Hunderte automatische Tests für Backend, Oberfläche und den kompletten Ablauf im
  Browser; jede Änderung läuft durch die CI, bevor sie live geht.
- **Vorbereitet für AR:** Analyse und Sicherheitslogik sind geräteunabhängig, Bauteile werden
  mit Positionsdaten markiert ([docs/06](docs/06-ar-ausbaustufe.md)).

### Zeitleiste von V3

Jede Zeile ist eine übernommene Änderung (Zeit = deutsche Zeit). Einzelheiten zu jeder Version
stehen im [CHANGELOG](CHANGELOG.md) und in der App unter **Änderungsprotokoll** (Fußzeile).

| Zeitpunkt | Änderung |
|---|---|
| 21.11.2026 17:24 | Doku: Bestandsaufnahme V2, Architektur und MVP-Plan für V3 |
| 21.11.2026 17:33 | Neu: Backend-Gerüst mit FastAPI, Health-Endpunkt und CI (#1) |
| 21.11.2026 17:43 | Neu: Ergebnisschema und Safety-Policy für alle Gewerke (#2) |
| 21.11.2026 17:47 | Neu: Mock-KI und Provider-Schnittstelle mit Testdaten-Kennzeichnung |
| 21.11.2026 17:57 | Neu: Persistenz (SQLAlchemy/SQLite) und Projekt-API (#4) |
| 21.11.2026 18:03 | Neu: Foto-Upload, Bildbereinigung und Analyse-Endpunkt (#5) |
| 21.11.2026 18:21 | Neu: Web-Gerüst mit Projektübersicht und generierten API-Typen (#6) |
| 21.11.2026 18:25 | Neu: AR-Ausbaustufe in Architektur und Roadmap, Positionsdaten und Overlay-Schnittstelle (#7) |
| 21.11.2026 18:52 | Neu: Vercel-Demo-Deployment mit Demo-Hinweis und Upload-Limit (#8) |
| 21.11.2026 19:12 | Neu: Foto aufnehmen und Ergebnis mit markierten Bauteilen anzeigen (#9) |
| 21.11.2026 19:23 | Neu: Dokumentation im Projekt – Prüfschritte abhaken, Notizen, Projektbericht (#10) |
| 21.11.2026 19:58 | Neu: Härtung – Rate-Limit, Fehler-IDs, KI-Zeitlimit, Sicherheits-Header, Browser-Test (#11) |
| 21.11.2026 21:32 | Neu: Gestaltung als Weiterentwicklung von V2, professionell und schlicht (#12) |
| 21.11.2026 22:06 | Neu: Echte KI – Gemini wie in V2 (Schritt 9) (#13) |
| 21.11.2026 22:25 | Behoben: Demo-Hinweis dezent in der Fußzeile (#14) |
| 22.11.2026 11:12 | Neu: Oberfläche und Ablauf wie V2 (#15) |
| 22.11.2026 11:21 | Neu: KI-Werkzeuge aus V2 und Fertig-Signal (#16) |
| 22.11.2026 11:30 | Neu: PDF, Teilen, Lokal speichern, Verlauf wie V2 (#17) |
| 22.11.2026 11:37 | Neu: Vorlesen, Offline, PWA wie V2 (#18) |
| 22.11.2026 12:11 | Behoben: Kopfleiste auf schmalen Handys (#19) |
| 22.11.2026 12:13 | Neu: Dauerhafter Speicher mit Postgres (Neon) (#20) |
| 22.11.2026 12:55 | Doku: Neon-Datenbank verbunden (#21) |
| 22.11.2026 12:59 | Technik: Vercel-Funktionen in Frankfurt (#22) |
| 22.11.2026 13:23 | Neu: Start in der Projektübersicht, App-Symbol in V3-Farben (#23) |
| 22.11.2026 13:54 | Behoben: Haftungshinweis nur bei Analysen (#24) |
| 22.11.2026 14:08 | Behoben: Gemini-Überlastung (503) automatisch wiederholen (#25) |
| 22.11.2026 14:14 | Neu: Entstehungsgeschichte in der README, Änderungsprotokoll in der App (#26) |
| 22.11.2026 14:27 | Behoben: Tipp auf Logo oder Schriftzug führt zur Projektübersicht (#27) |
| 22.11.2026 14:42 | Neu: Abzeichen „AR-vorbereitet“ in der Kopfleiste (#28) |
| 22.11.2026 15:15 | Geändert: „3.0“ direkt neben dem Schriftzug (#29) |

### Ausblick

Als Nächstes stehen die AR-Ausbaustufe und – nur mit Marcos ausdrücklicher Zustimmung, weil
kostenpflichtig – weitere V2-Funktionen wie Vorlesen mit Google-Stimme, Standort und
Video-Suche an.

## Ablauf wie in V2

1. **Beruf auswählen** (wird gemerkt, App-Farbe folgt dem Beruf)
2. **Problem dokumentieren & analysieren** – bis zu 5 Fotos und/oder eine Beschreibung
3. **Ergebnis der KI-Analyse** – „Lösung und Diagnose“ mit schrittweiser Lösung, dazu
   Sicherheitsblock, Unsicherheiten, nächste Prüfschritte (abhakbar) und Bauteil-Markierungen
4. **KI-Werkzeuge** wie V2: Materialliste, Sicherheits-Check, Kostenschätzung, Kundenbericht
   und je Beruf zwei Spezial-Tools (auch ohne Analyse nutzbar)
5. **Weitergeben** wie V2: Als PDF exportieren, Teilen (WhatsApp, Telegram, E-Mail …),
   Lokal speichern; **Verlauf** über die Kopfleiste
6. **Unterwegs** wie V2: Diagnose vorlesen, Offline-Warteschlange und Offline-Kurzhilfe,
   als App installierbar
7. Optional: Analyse einem Projekt zuordnen, Projektbericht

> Sm@rtCraft erteilt **keine** Sicherheitsfreigaben. Bei elektrischen Installationen weist
> jede Analyse Risiken, Unsicherheiten und die Pflicht zur Prüfung durch eine
> Elektrofachkraft aus.

## Online-Demo (Vercel)

Projekt `smartcraft-v3` im Vercel-Team von Marco; jeder Push auf `main` wird automatisch
veröffentlicht. **Nur nach Vercel-Login erreichbar.** KI: Gemini. Speicher: Postgres bei Neon
(kostenlos, über den Vercel-Marketplace verbunden, ADR 0013); ohne verbundene Datenbank läuft
der Demo-Betrieb mit flüchtigem Speicher (ADR 0007).

## Dokumentation

- [01 – Analyse V2](docs/01-v2-analyse.md)
- [02 – Architektur V3](docs/02-architektur.md)
- [03 – Projektstruktur](docs/03-projektstruktur.md)
- [04 – MVP-Plan](docs/04-mvp-plan.md)
- [05 – Entscheidungen und Risiken](docs/05-entscheidungen-und-risiken.md)
- [06 – AR-Ausbaustufe](docs/06-ar-ausbaustufe.md)
- [07 – Betrieb und Fehlerübersicht](docs/07-betrieb-und-fehler.md)
- [ADRs](docs/adr/)

## Tech-Stack

FastAPI + Pydantic + SQLAlchemy, SQLite lokal / Postgres (Neon) online (Backend) ·
React + TypeScript + Vite + Tailwind, installierbar als App (Web) · Google Gemini wie in V2,
lokal und in Tests eine kostenlose Mock-KI.

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
