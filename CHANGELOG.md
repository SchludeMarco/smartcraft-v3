# Changelog

## [0.12.0] – 2026-11-21

### Geändert
- **Gestaltung wie V2** (ADR 0010): dunkelblauer Hintergrund, Kopfleiste mit Logo und
  Schriftzug „Sm@rtCraft!“ (Cinzel, lokal eingebunden), Pergament-Panels, grüne
  Schritt-Labels und Buttons, Favicons aus V2.
- Berufswahl als farbige Kacheln mit Icons wie in V2; Akzentfarbe je Gewerk.
- Neue Analyse in den V2-Schritten „1. Beruf auswählen“ / „2. Problem dokumentieren &
  analysieren“, Haupt-Button „Problem analysieren“; Ergebnis als „3. Ergebnis der
  KI-Analyse“.
- Gewerk-Etiketten in Analyseliste und Ergebnis.

## [0.11.0] – 2026-11-21

### Hinzugefügt (Härtung, ADR 0009)
- Rate-Limit: Analysen pro Client (10/Minute, 200/Tag), globale Tages-Kostenbremse (500),
  schreibende Anfragen (120/Minute); Antwort 429 mit `Retry-After` und Klartext.
- `X-Request-ID` an jeder Antwort; unerwartete Fehler → 500 ohne interne Details, mit
  Fehler-ID für die Log-Suche.
- Zeitlimit für KI-Aufrufe (`SMARTCRAFT_AI_TIMEOUT_SECONDS`, 25 s) → 502, nichts gespeichert.
- Sicherheits-Header auf Vercel: Content-Security-Policy, Permissions-Policy.
- Browser-Test des kompletten Ablaufs mit Playwright (`npm run e2e`) und CI-Job `e2e`.
- Fehlerübersicht und Betriebshinweise: `docs/07-betrieb-und-fehler.md`.
- 13 neue Backend-Tests (264), 1 neuer Frontend-Test (30), 2 Browser-Tests.

## [0.10.0] – 2026-11-21

### Hinzugefügt
- **Prüfschritte dokumentieren** (`PATCH /analyses/{id}/checks/{check_id}`): erledigt / nicht
  zutreffend / wieder offen, mit Name, Zeitpunkt, Kommentar. Fachkraft-Schritte verlangen eine
  ausdrückliche Bestätigung, „nicht zutreffend“ eine Begründung. Ändert nie das KI-Ergebnis.
- **Projektnotizen** (`GET/POST /projects/{id}/notes`, `DELETE …/notes/{note_id}`).
- **Projektbericht** (`GET /projects/{id}/report`, Web-Seite zum Drucken bzw. „Als PDF
  speichern“) mit Haftungshinweis an erster Stelle und Stand der Prüfschritte.
- Web: abhakbare Prüfschritt-Karten, Notizen auf der Projektseite, Berichtsseite mit
  Druckansicht; Name wird lokal für das nächste Mal gemerkt.
- ADR 0008; 21 neue Backend-Tests (251), 8 neue Frontend-Tests (29).

### Hinweis
- Neue Tabelle `project_notes` und Spalte `check_items.qualified_person_confirmed`: eine
  vorhandene lokale `smartcraft.db` bitte löschen.

## [0.9.0] – 2026-11-21

### Hinzugefügt
- **Neue Analyse per Foto** in der Web-App: Gewerk wählen, bis zu 5 Fotos aufnehmen oder
  aus der Galerie wählen (Vorschau, Entfernen), optionale Notiz.
- Fotos werden schon im Browser auf max. 1600 px verkleinert und neu kodiert – bleibt unter
  dem Vercel-Limit und entfernt Standortdaten bereits auf dem Gerät.
- **Ergebnisansicht:** Sicherheitsblock immer zuerst (Testdaten, Risiko, Fachkraft-Pflicht,
  Gefahren, Hinweise, Haftungshinweis), Foto mit **markierten Bauteilen** (AR-1 im Kleinen,
  Daten aus `/analyses/{id}/overlay`), Prüfschritte mit Pflicht-Kennzeichnung und
  Bauteilbezug, Auffälligkeiten, Beobachtungen, Unsicherheiten, Beschriftungen mit
  Konfidenz, Protokoll der Sicherheitsprüfung.
- Backend: `GET /meta/trades` und `GET /meta/analysis-limits` – eine Quelle für alle Clients.
- Frontend-Testdaten aus echten Backend-Antworten (`apps/api/scripts/export_web_fixtures.py`);
  21 Frontend-Tests, 230 Backend-Tests.

## [0.8.0] – 2026-11-21

### Hinzugefügt
- Vercel-Demo-Deployment (ADR 0007): `vercel.json`, Einstiegspunkt `api/index.py`
  (FastAPI unter `/api`), `requirements.txt` aus `uv.lock`, CI prüft den Gleichstand.
- Einstellung `SMARTCRAFT_PERSISTENT_STORAGE`; `/health` meldet `persistent_storage`.
- Demo-Hinweis in der Web-App, wenn Daten nicht dauerhaft gespeichert werden.
- Upload-Limit auf Vercel 4 MB (Vercel-Grenze 4,5 MB pro Anfrage).
- Tests für den Vercel-Einstiegspunkt.

## [0.7.0] – 2026-11-21

### Hinzugefügt
- **AR-Ausbaustufe in Vision, Architektur und Roadmap** (`docs/06-ar-ausbaustufe.md`,
  ADR 0006): AR-Brillen als gleichrangiger Client derselben Analyse- und Sicherheitslogik;
  Ausbaustufen AR-0 bis AR-4; Sicherheitsregeln für Einblendungen im Sichtfeld.
- Schema 1.2.0: optionale Bauteil-Region im Foto (`Component.region`, normierte
  Koordinaten) und Bauteil-Verweise an Auffälligkeiten und Prüfschritten
  (`component_indices`); ungültige Verweise werden abgelehnt.
- Policy 1.2.0: Pflicht-Prüfschritte werden an den Bauteilen verankert, an denen die Gefahr
  erkannt wurde.
- `GET /analyses/{id}/overlay`: geräteunabhängige Einblendungs-Sicht mit Pflicht-
  Sicherheitsblock (Format 1.0.0).
- Mock-Szenarien mit Bauteil-Regionen; 23 neue Tests (225 gesamt).

### Hinweis
- Neue Spalte `check_items.component_indices`: eine vorhandene lokale `smartcraft.db`
  bitte löschen (Migrationen folgen).

## [0.6.0] – 2026-11-21

### Hinzugefügt
- Web-App `apps/web`: React 19, TypeScript (strict), Vite, Tailwind, TanStack Query,
  React Router; mobil zuerst.
- Projektübersicht, „Projekt anlegen“ (mit Validierung), Projektseite mit Analyseliste
  (Risiko, Fachkraft-Pflicht, Testdaten-Kennzeichnung).
- Dauerhafter Testmodus-Hinweis, solange das Backend die Mock-KI nutzt.
- API-Typen werden aus dem OpenAPI-Schema generiert (`openapi_export`, `npm run gen:api`);
  CI prüft, dass Backend-Vertrag und Frontend-Typen übereinstimmen.
- CI-Job für das Web (Lint, Typprüfung, Tests, Build); 8 Frontend-Tests.

## [0.5.0] – 2026-11-21

### Hinzugefügt
- Bildpipeline (`media/processing.py`): Formatprüfung nach Inhalt, EXIF-Drehung, Verkleinern
  auf max. 1600 px, Neu-Kodierung als JPEG ohne Metadaten (EXIF/GPS entfernt), Größen- und
  Auflösungslimits.
- Lokale Foto-Ablage (`media/storage.py`) mit Schutz vor Pfad-Tricks.
- `POST /projects/{id}/analyses` (multipart: `trade`, `files`, optional `note`): kompletter
  Ablauf Foto → Bereinigung → KI → Safety-Policy → Speichern.
- `GET /analyses/{id}/captures/{capture_id}/image` liefert das bereinigte Foto.
- Projekt löschen entfernt auch die Fotodateien; bei Fehlern bleiben keine Dateien liegen.
- Neue Variablen: `SMARTCRAFT_STORAGE_DIR`, `SMARTCRAFT_MAX_UPLOAD_MB`,
  `SMARTCRAFT_MAX_IMAGE_MEGAPIXELS`, `SMARTCRAFT_MAX_IMAGE_EDGE`.
- ADR 0005, 38 neue Tests (202 gesamt).

## [0.4.0] – 2026-11-21

### Hinzugefügt
- Persistenz mit SQLAlchemy 2 und SQLite (`persistence/`): Tabellen `projects`,
  `analyses`, `captures`, `check_items`; Repository mit Projekt-CRUD und
  `save_analysis()` (nur Ergebnisse der aktuellen Policy-Version).
- Projekt-API: `POST/GET /projects`, `GET/PATCH/DELETE /projects/{id}`,
  `GET /projects/{id}/analyses`; Analyse lesen: `GET /analyses/{id}`.
- Gespeicherte Ergebnisse werden beim Lesen erneut gegen das Schema validiert.
- `SMARTCRAFT_DATABASE_URL`; Start per App-Factory (`uvicorn --factory`).
- ADR 0004, 26 neue Tests (164 gesamt).

## [0.3.0] – 2026-11-21

### Hinzugefügt
- Provider-Schnittstelle `AnalysisProvider` mit `parse_draft()` (`ai/provider.py`) und
  Registry (nur `mock`).
- Kostenlose, lokale Mock-KI mit drei reproduzierbaren Szenarien: Unterverteilung mit FI,
  Heizungsanlage, unbrauchbares Foto (`ai/mock.py`, `ai/mock_scenarios/`).
- Analyse-Ablauf `run_analysis()`: Eingabeprüfung (1–5 Fotos, JPEG/PNG/WebP, Notiz ≤ 2000
  Zeichen) → Provider → Schema → Safety-Policy.
- Schema 1.1.0: `source` (Provider, Modell, `is_test_data`).
- Policy 1.1.1: Testdaten werden in Zusammenfassung, Unsicherheiten und Hinweisen
  unübersehbar gekennzeichnet.
- ADR 0003, Tests für alle Szenarien (138 gesamt).

### Behoben
- Fehlalarm: „Heizkreisverteilung“ wurde als elektrische Anlage erkannt.

## [0.2.0] – 2026-11-21

### Hinzugefügt
- Ergebnisschema v1.0.0 (`domain/analysis.py`): `AnalysisDraft` (Provider-Ausgabe,
  unbekannte Felder verboten) und `AnalysisResult`; alle zehn Gewerke aus V2.
- Safety-Policy v1.0.0 (`safety/`): Gefahrenerkennung (Elektro, Gas, Tragwerk, Höhe,
  Schadstoffe), Mindest-Risiko, Fachkraft-Pflicht, Pflicht-Prüfschritte, Neutralisierung von
  Freigabe-Formulierungen, Umgang mit unbrauchbaren Fotos, Eingriffsprotokoll.
- 104 Tests für Schema und Policy, ADR 0002.

## [0.1.0] – 2026-11-21

### Hinzugefügt
- Backend-Gerüst `apps/api`: FastAPI-App-Factory, Settings (`SMARTCRAFT_*`), `GET /health`,
  ruff, mypy (strict), pytest, GitHub-Actions-CI.

## [0.0.1] – 2026-11-21

### Hinzugefügt
- Bestandsaufnahme von V2, Architektur, Projektstruktur, MVP-Plan, Entscheidungen und Risiken
  (`docs/`), ADR 0001, Arbeitsregeln (`CLAUDE.md`).
