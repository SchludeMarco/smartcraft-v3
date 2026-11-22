# ADR 0012 – V2-Konzept beibehalten: V3 ist eine Weiterentwicklung, keine neue App

- Status: angenommen
- Datum: 2026-11-22
- Löst ab: ADR 0010 (Gestaltung)

## Kontext

Marco (22.11.2026): V3 war in Optik, Bedienung und Ablauf zu weit von V2 entfernt
(Projekte als Startseite, eigene Farbwelt, fehlende V2-Werkzeuge). Gewünscht ist eine
Weiterentwicklung von V2. Lila-Blau soll nur die neue Version signalisieren.

## Entscheidung

1. **Ablauf und Bedienung wie V2.** Startseite = „1. Beruf auswählen → 2. Problem
   dokumentieren & analysieren → 3. Ergebnis der KI-Analyse“. Foto ODER Beschreibung reicht.
2. **Optik wie V2**: Pergament-Panels, Abschnitts-Pillen, Quest-/Pergament-Buttons,
   Berufskacheln, Akzentfarbe je Beruf, Haftungshinweis. CSS-Klassen aus V2 übernommen.
   Einziger Unterschied: Kopfleiste und Hintergrund in Lila-Blau, „3.0“ im Schriftzug.
3. **V3-Unterbau bleibt unsichtbar darunter**: Safety-Policy, strenges Schema, Bildbereinigung,
   KI nur im Backend, AR-fähige Bauteildaten. Das V2-Ergebnis „Lösung und Diagnose“ wird um
   den Sicherheitsblock, Unsicherheiten und abhakbare Prüfschritte ergänzt.
4. **Projekte werden optional** (Kopfleisten-Knopf, nachträgliche Zuordnung).
5. **V2-Funktionen folgen schrittweise**, je ein PR:
   - KI-Werkzeuge: Materialliste, Sicherheits-Check, Kostenschätzung, Kundenbericht,
     Berufs-Spezial-Tools – alle serverseitig und durch eine Text-Policy (keine Freigabe-,
     Normkonformitäts- oder „sicher“-Aussagen).
   - PDF-Export, Teilen, Lokal speichern, Verlauf.
   - Vorlesen (Browser-Stimme), Offline-Warteschlange, PWA.
   - Kostenpflichtige V2-Teile (Google-TTS, Geocoding, Video-Suche mit Search-Grounding)
     nur nach Zustimmung.

## Folgen

- Schema 1.3.0 (`diagnosis`, `solution_steps`), Policy 1.3.0, Prompt 1.1.0.
- `analyses.project_id` ist nullable; neue Endpunkte `POST/GET /analyses`, `PATCH /analyses/{id}`.
- Bei Fachkraft-Pflicht stellt die Policy den Lösungsschritten einen Warnschritt voran, damit
  die V2-typische Schritt-für-Schritt-Lösung nicht als Laien-Anleitung missverstanden wird.
- Google-Login, Gästeliste, Standort und Admin aus V2 entfallen vorerst: Zugang regelt die
  Vercel-Anmeldung (ADR 0007).

## Nachtrag 22.11.2026 – Teil 2

- KI-Werkzeuge liegen in `smartcraft_api/tools/catalog.py` (versioniert), Ausführung über
  `POST /tools/{id}`, Prüfung durch `safety/text_policy.py` (Policy 1.4.0).
- Neu auf Wunsch von Marco: Fertig-Signal nach jeder Analyse (Wackeln, Klang, Vibration),
  rein im Client und ohne Einfluss auf Inhalte.

## Nachtrag 22.11.2026 – Teile 3 und 4

- PDF/Teilen/Lokal speichern/Verlauf und Vorlesen/Offline/PWA umgesetzt, alles kostenlos
  (Druckdialog, IndexedDB, Browser-Stimme, Service Worker).
- Weiterhin bewusst nicht übernommen (kostenpflichtig bzw. eigene Entscheidung):
  Google-Sprachausgabe, Adresssuche/Standort, Video-Suche, Google-Login/Gästeliste, Feedback-
  und Admin-Bereich.
