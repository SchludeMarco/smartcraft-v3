# Changelog

Alle Änderungen an Sm@rtCraft 3.0, neueste zuerst. Jeder Eintrag trägt einen Zeitstempel
(Datum und Uhrzeit, deutsche Zeit) – den Zeitpunkt der Änderung. Dasselbe Protokoll ist in
der App unter „Änderungsprotokoll“ (Fußzeile) zu sehen; die CI prüft, dass jeder PR hier
einen Eintrag mit Zeitstempel ergänzt.

## [0.22.2] – 2026-11-22 16:01

### Behoben (Wunsch Marco)
- **„Lokal speichern“ aktualisiert die App sofort:** Die gesicherte Analyse erscheint direkt
  im Verlauf unter „Lokal“ (vorher bis zu 30 s alter Stand oder erst nach Neuladen).
- Kommen nach dem Speichern weitere Werkzeug-Ergebnisse dazu, zeigt der Knopf wieder
  „Lokal speichern“, damit die neue Fassung gesichert werden kann.
- Tests laufen mit denselben Zwischenspeicher-Einstellungen wie die App, damit solche Fehler
  auffallen.

## [0.22.1] – 2026-11-22 15:15

### Geändert (Wunsch Marco)
- Versions-Abzeichen **„3.0“ steht direkt rechts neben dem Schriftzug Sm@rtCraft!** statt
  hinter dem Untertitel. Auf sehr schmalen Handys werden Schrift und Abstände der Kopfleiste
  etwas kleiner, damit nichts überlappt.

## [0.22.0] – 2026-11-22 14:42

### Hinzugefügt (Wunsch Marco)
- Abzeichen **„AR-vorbereitet“** in der Kopfleiste neben „3.0“: Die App ist für AR-Brillen
  vorbereitet (geräteunabhängige Einblendungs-Schnittstelle mit Sicherheitsblock); die
  Brillen-Anzeige selbst folgt in einer späteren Ausbaustufe. Bewusst nicht „AR-geeignet“,
  damit keine falschen Erwartungen entstehen.

## [0.21.1] – 2026-11-22 14:27

### Behoben (Wunsch Marco)
- Tipp auf das Sm@rtCraft-Logo **oder den Schriftzug** führt zurück zur Projektübersicht
  (vorher reagierte nur das kleine Hammer-Symbol).

## [0.21.0] – 2026-11-22 14:14

### Hinzugefügt (Wunsch Marco)
- **Änderungsprotokoll in der App:** neue Seite „Änderungsprotokoll“ (Link in der Fußzeile
  mit aktueller Version), alle Versionen mit Datum und Uhrzeit, neueste zuerst. Quelle ist
  die CHANGELOG.md im Projekt; sie wird beim Bauen eingebunden.
- **Zeitstempel für jede Version:** alle bisherigen Einträge tragen jetzt Datum und Uhrzeit.
- **CI-Prüfung:** Jeder PR muss CHANGELOG.md mit einem Eintrag „JJJJ-MM-TT HH:MM“ ergänzen.
- **README:** vollständige Entstehungsgeschichte von der Idee über V1 und V2 bis zur
  Zeitleiste von V3.

## [0.20.0] – 2026-11-22 14:08

### Behoben
- **„Gemini-API antwortete mit Status 503“:** Bei kurzzeitiger Überlastung der Google-Server
  versucht das Backend es jetzt bis zu dreimal (nach 1, 2 und 4 s). Klappt es trotzdem nicht,
  erscheint eine verständliche Meldung („Die Gemini-KI ist gerade überlastet …“).
  KI-Zeitlimit 45 s, Vercel-Funktion 60 s (ADR 0011, Nachtrag).

## [0.19.0] – 2026-11-22 13:23

- Haftungshinweis (EU AI Act) nur noch bei Analysen und Ergebnissen, nicht mehr vor der
  Projektauswahl beim Start.

### Geändert (Wunsch Marco)
- **Start in der Projektübersicht:** Projekt auswählen oder anlegen; ohne Projekte ist das
  Formular für das erste Projekt direkt offen. Der V2-Ablauf liegt unter `/analyse` und wird
  aus dem Projekt („Neue Analyse für dieses Projekt“) oder als „Schnellanalyse ohne Projekt“
  geöffnet. Kopfleiste: Logo → Projektübersicht, Knopf „Analyse“ → Schnellanalyse.
- **App-Symbol in V3-Farben:** Lila-Blau mit Lavendel-Ring und -Blitz (Favicon,
  Homescreen- und PWA-Icons, erzeugt mit `npm run icons`).

## [0.18.0] – 2026-11-22 12:13

- Neon-Datenbank in Vercel verbunden; Production speichert ab jetzt dauerhaft.

### Hinzugefügt (ADR 0013)
- **Dauerhafter Speicher:** Postgres (Neon über Vercel) für Projekte, Analysen und Fotos.
  Behebt „Projekt nicht gefunden“ auf Vercel (flüchtiger Speicher je Instanz).
- Fotos können in der Datenbank liegen (`SMARTCRAFT_STORAGE_BACKEND=database`).
- `DATABASE_URL`/`POSTGRES_URL` werden erkannt; Vercel schaltet automatisch um.
- CI: alle API-Tests zusätzlich gegen Postgres 16.

### Behoben
- Kopfleiste: „3.0“ überlappte auf schmalen Handys die Knöpfe.

## [0.17.0] – 2026-11-22 11:37

### Hinzugefügt (Teil 4 der V2-Weiterentwicklung, ADR 0012)
- **Diagnose vorlesen** wie V2 (Kurz/Vollständig, Weiblich/Männlich) mit der kostenlosen
  Browser-Stimme; Sicherheit und Testdaten-Hinweis werden immer zuerst vorgelesen.
- **Offline wie V2:** Hinweis „Kein Empfang“, Analyse „Für später speichern (offline)“ in einer
  Warteschlange auf dem Gerät, automatisches Nachholen bei Empfang (mit Fertig-Signal),
  Warteschlange verwalten, **Offline-Kurzhilfe** je Beruf (Inhalte aus V2).
- **Als App installierbar (PWA)** wie V2: App-Hülle wird gecacht, Start ohne Empfang;
  `/api` läuft nie über den Service Worker.

## [0.16.0] – 2026-11-22 11:30

### Hinzugefügt (Teil 3 der V2-Weiterentwicklung, ADR 0012)
- **Als PDF exportieren** wie V2: druckfertiger Bericht (Sicherheit zuerst, Diagnose, Lösung,
  Prüfschritte, Unsicherheiten, Fotos, KI-Werkzeuge, Haftungshinweis) über den Druckdialog.
- **Teilen** wie V2: WhatsApp, Telegram, E-Mail, Text kopieren, natives Teilen mit Fotos,
  Fotos zum Anhängen herunterladen. Der Text enthält immer den Sicherheitsblock.
- **Lokal speichern** wie V2: Analyse inkl. Fotos und Werkzeug-Ergebnissen nur auf dem Gerät
  (IndexedDB) – bleibt auch, wenn der Demo-Server neu startet.
- **Verlauf** wie V2 (Knopf in der Kopfleiste): Reiter „Gespeichert“ (Server, letzte 20) und
  „Lokal“ (Gerät, einzeln löschbar); lokale Analysen lassen sich ohne Server ansehen.
- Alle Berichte werden ohne Modell-HTML erzeugt (alles escaped).

## [0.15.0] – 2026-11-22 11:21

### Hinzugefügt (Teil 2 der V2-Weiterentwicklung, ADR 0012)
- **KI-Werkzeuge aus V2**, serverseitig und durch eine Text-Policy geprüft:
  - „Zusätzliche KI-Tools“ unter dem Ergebnis: Materialliste (als Tabelle), Sicherheits-Check,
    Kostenschätzung, Kundenbericht.
  - **Berufs-Spezial-Tools** (je Beruf zwei, beim Allround-Handwerker alle 18), sofort nach
    der Berufswahl nutzbar; Grundlage wie V2: Analyse > Beschreibung > nur der Beruf.
  - Werkzeuge, die in V2 „auf Normkonformität prüfen“ sollten (TrinkwV, VDE), nennen jetzt
    Anforderungen und Prüfpflichten – ohne Konformitätsaussage.
- **Fertig-Signal:** Ist die Analyse fertig, wackelt der Bildschirm kurz, ein Klang ertönt
  (wie V2) und das Handy vibriert. Bei „Bewegung reduzieren“ entfällt das Wackeln.
- API: `GET /tools`, `POST /tools/{id}`; Ergebnis mit Pflicht-Sicherheitsblock.
- Policy 1.4.0: Text-Policy für Werkzeug-Antworten (Freigabe-Sprache neutralisieren,
  Gefahren aus Beruf/Analyse/Text, Fachkraft-Pflicht, Testdaten-Hinweis).

### Behoben
- `POST /analyses` (ohne Projekt) zählte nicht gegen das Analyse-Limit; jetzt zählen alle
  KI-Aufrufe (Analysen und Werkzeuge) gegen dasselbe Limit.

## [0.14.0] – 2026-11-22 11:12

### Geändert (ADR 0012: V2-Konzept beibehalten)
- **Startseite ist wieder der V2-Ablauf:** „1. Beruf auswählen → 2. Problem dokumentieren &
  analysieren → 3. Ergebnis der KI-Analyse“ auf einer Seite, Ergebnis direkt darunter.
- **Optik und Bedienung wie V2:** Pergament-Fenster, grüne Abschnitts-Pillen, grüner
  „Problem analysieren“-Button, Pergament-„Zurücksetzen“, Berufskacheln im 5er-Raster,
  App-Farbe folgt dem Beruf (gemerkt), roter Haftungshinweis (EU AI Act, pro Sitzung
  wegklickbar), Startkarte „Starten Sie Ihre Bauanalyse“, Ladeanzeige und Fehlerbox wie V2.
  Lila-Blau nur in Kopfleiste und Hintergrund als Zeichen für 3.0.
- **Ergebnis „Lösung und Diagnose“** mit Diagnose und schrittweiser Lösung (neu im Schema),
  ergänzt um Sicherheitsblock, Prüfschritte, Unsicherheiten und Foto-Markierungen.
- Projekte sind optional: Kopfleisten-Knopf „Projekte“, Analyse nachträglich zuordnen oder
  von der Projektseite aus direkt für ein Projekt starten.

### Hinzugefügt
- Analyse **ohne Foto, nur mit Beschreibung** (wie V2). Die Policy senkt dann die Konfidenz,
  ergänzt „Foto aufnehmen“ als ersten Prüfschritt und eine Unsicherheit.
- Schema 1.3.0: `diagnosis`, `solution_steps`. Policy 1.3.0: neutralisiert Freigabe-Sprache
  auch dort, erkennt Gefahren in Diagnose/Schritten, stellt bei Fachkraft-Pflicht einen
  Warnschritt voran. Prompt 1.1.0.
- API: `POST /analyses` (ohne Projekt), `GET /analyses` (Verlauf), `PATCH /analyses/{id}`
  (Projekt zuordnen). `project_id` einer Analyse ist jetzt optional.

### Hinweis
- Bestehende lokale SQLite-Dateien bitte neu anlegen (Spalte `project_id` jetzt nullable).

## [0.13.1] – 2026-11-21 22:25

### Geändert
- Demo-Hinweis zum flüchtigen Speicher ist kein Banner mehr, sondern eine dezente Zeile
  in der Fußzeile. Der Testmodus-Hinweis der Mock-KI bleibt unverändert auffällig.

## [0.13.0] – 2026-11-21 22:06

### Hinzugefügt (ADR 0011)
- **Echte KI wie in V2:** Google-Gemini-Provider (`gemini-flash-lite-latest`) hinter
  `SMARTCRAFT_AI_PROVIDER=gemini`. Schlüssel über `SMARTCRAFT_GEMINI_API_KEY` oder wie in
  V2 `GEMINI_API_KEY`; geht im Header mit, nie in der URL oder in Fehlermeldungen.
- Versionierter System-Prompt (`ai/prompts.py`, Prompt 1.0.0) mit Ergebnisschema; die
  Problembeschreibung wird als Daten, nicht als Anweisung übergeben.
- Antworten werden streng gegen das Schema geprüft (unbekannte Felder wie „approved“ →
  Fehler 502) und laufen wie bisher durch die Safety-Policy.
- Standard bleibt die kostenlose Mock-KI; ohne Schlüssel startet `gemini` nicht.

## [0.12.0] – 2026-11-21 21:32

### Geändert (ADR 0010)
- **Gestaltung als Weiterentwicklung von V2:** Kopfleiste mit Logo und Schriftzug
  „Sm@rtCraft!“ (Cinzel, lokal eingebunden), Favicons, Ablauf in den V2-Schritten
  „1. Beruf auswählen“ / „2. Problem dokumentieren & analysieren“ / „3. Ergebnis der
  KI-Analyse“, Berufswahl als farbige Kacheln mit Icons, Gewerk-Etiketten.
- **Farbgebung professionell und schlicht:** Kopfleiste in Lila-Blau, Indigo-Hintergrund,
  helle Fensterflächen mit feinem Rahmen, polierte Buttons, neutrale Grautöne.

## [0.11.0] – 2026-11-21 19:58

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

## [0.10.0] – 2026-11-21 19:23

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

## [0.9.0] – 2026-11-21 19:12

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

## [0.8.0] – 2026-11-21 18:52

### Hinzugefügt
- Vercel-Demo-Deployment (ADR 0007): `vercel.json`, Einstiegspunkt `api/index.py`
  (FastAPI unter `/api`), `requirements.txt` aus `uv.lock`, CI prüft den Gleichstand.
- Einstellung `SMARTCRAFT_PERSISTENT_STORAGE`; `/health` meldet `persistent_storage`.
- Demo-Hinweis in der Web-App, wenn Daten nicht dauerhaft gespeichert werden.
- Upload-Limit auf Vercel 4 MB (Vercel-Grenze 4,5 MB pro Anfrage).
- Tests für den Vercel-Einstiegspunkt.

## [0.7.0] – 2026-11-21 18:25

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

## [0.6.0] – 2026-11-21 18:21

### Hinzugefügt
- Web-App `apps/web`: React 19, TypeScript (strict), Vite, Tailwind, TanStack Query,
  React Router; mobil zuerst.
- Projektübersicht, „Projekt anlegen“ (mit Validierung), Projektseite mit Analyseliste
  (Risiko, Fachkraft-Pflicht, Testdaten-Kennzeichnung).
- Dauerhafter Testmodus-Hinweis, solange das Backend die Mock-KI nutzt.
- API-Typen werden aus dem OpenAPI-Schema generiert (`openapi_export`, `npm run gen:api`);
  CI prüft, dass Backend-Vertrag und Frontend-Typen übereinstimmen.
- CI-Job für das Web (Lint, Typprüfung, Tests, Build); 8 Frontend-Tests.

## [0.5.0] – 2026-11-21 18:03

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

## [0.4.0] – 2026-11-21 17:57

### Hinzugefügt
- Persistenz mit SQLAlchemy 2 und SQLite (`persistence/`): Tabellen `projects`,
  `analyses`, `captures`, `check_items`; Repository mit Projekt-CRUD und
  `save_analysis()` (nur Ergebnisse der aktuellen Policy-Version).
- Projekt-API: `POST/GET /projects`, `GET/PATCH/DELETE /projects/{id}`,
  `GET /projects/{id}/analyses`; Analyse lesen: `GET /analyses/{id}`.
- Gespeicherte Ergebnisse werden beim Lesen erneut gegen das Schema validiert.
- `SMARTCRAFT_DATABASE_URL`; Start per App-Factory (`uvicorn --factory`).
- ADR 0004, 26 neue Tests (164 gesamt).

## [0.3.0] – 2026-11-21 17:47

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

## [0.2.0] – 2026-11-21 17:43

### Hinzugefügt
- Ergebnisschema v1.0.0 (`domain/analysis.py`): `AnalysisDraft` (Provider-Ausgabe,
  unbekannte Felder verboten) und `AnalysisResult`; alle zehn Gewerke aus V2.
- Safety-Policy v1.0.0 (`safety/`): Gefahrenerkennung (Elektro, Gas, Tragwerk, Höhe,
  Schadstoffe), Mindest-Risiko, Fachkraft-Pflicht, Pflicht-Prüfschritte, Neutralisierung von
  Freigabe-Formulierungen, Umgang mit unbrauchbaren Fotos, Eingriffsprotokoll.
- 104 Tests für Schema und Policy, ADR 0002.

## [0.1.0] – 2026-11-21 17:33

### Hinzugefügt
- Backend-Gerüst `apps/api`: FastAPI-App-Factory, Settings (`SMARTCRAFT_*`), `GET /health`,
  ruff, mypy (strict), pytest, GitHub-Actions-CI.

## [0.0.1] – 2026-11-21 17:24

### Hinzugefügt
- Bestandsaufnahme von V2, Architektur, Projektstruktur, MVP-Plan, Entscheidungen und Risiken
  (`docs/`), ADR 0001, Arbeitsregeln (`CLAUDE.md`).
