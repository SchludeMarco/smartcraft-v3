# 04 – MVP-Plan: Installation Analyzer

Ziel: Ein Handwerker fotografiert eine Installation, erhält eine strukturierte,
sicherheitsgeprüfte Analyse und legt sie in einem Projekt ab. Alles lokal und
kostenlos lauffähig (Mock-KI), echter KI-Provider erst nach Freigabe.

Jeder Schritt ist ein eigener, kleiner Pull Request mit Tests.

| # | Schritt | Ergebnis / Abnahme |
|---|---|---|
| 0 | **Bestandsaufnahme & Doku** | Diese Dokumente, CLAUDE.md, README ✅ |
| 1 | **Backend-Gerüst** | FastAPI-App, Settings, `/health`, ruff/mypy/pytest, CI-Workflow grün ✅ |
| 2 | **Ergebnisschema + Safety-Policy** | `InstallationAnalysis` v1, `apply_safety_policy()`; Tests: Elektro erzwingt Fachkraft-Pflicht, Freigabe-Formulierungen werden neutralisiert, Disclaimer immer gesetzt, Policy kann nie entschärfen ✅ |
| 3 | **Provider-Interface + MockProvider** | `AnalysisProvider`-Protocol, Mock mit 3 Szenarien (Unterverteilung, Heizungsanlage, unbrauchbares Foto), Ergebnisse als Testdaten gekennzeichnet ✅ |
| 4 | **Persistenz + Projekt-API** | SQLModel-Tabellen `Project`, `Analysis`, `Capture`, `CheckItem`; CRUD-Endpunkte; API-Tests ✅ |
| 5 | **Media-Pipeline + Analyse-Endpunkt** | Upload, Typ-/Größenprüfung, EXIF/GPS entfernen, Resize; `POST /projects/{id}/analyses` läuft komplett mit Mock ✅ |
| 6 | **Web-Gerüst** | Vite + React + TS, generierte API-Typen, Projektliste, Projekt anlegen ✅ |
| 7 | **Capture & Ergebnisansicht** | Kamera-Upload (`capture="environment"`), Ladezustand, Ergebnis mit Sicherheitsbanner oben, Beobachtungen/Auffälligkeiten/Unsicherheiten/Prüfschritte getrennt dargestellt; Bauteile im Foto markiert (AR-1) ✅ |
| 8 | **Dokumentation im Projekt** | Notizen, Prüfschritte abhaken (Mensch), Projektbericht als druckbare Seite/PDF |
| 9 | **Echter KI-Provider** *(nur nach Freigabe)* | Provider hinter Feature-Flag, Eval-Set mit 10–20 eigenen Fotos, Messung: Schemaquote, Policy-Eingriffe, Halluzinationen bei Beschriftungen |
| 10 | **Härtung** | Rate-Limit, Fehlerbilder, E2E-Test (Playwright), README-Setup in 5 Minuten nachvollziehbar |

## Definition of Done (MVP)

- Kompletter Ablauf Foto → Analyse → Projektablage funktioniert lokal mit Mock-KI.
- Kein Ergebnis kann eine Sicherheitsfreigabe enthalten (durch Tests belegt).
- Elektro-Analysen zeigen immer: Risikostufe, Unsicherheiten, Pflicht zur Prüfung durch
  eine Elektrofachkraft.
- CI grün, Doku aktuell, keine Secrets im Repo, keine laufenden Kosten.

## Roadmap nach dem MVP

| Phase | Inhalt |
|---|---|
| **AR-0 – AR-Datenfundament** ✅ | Bauteil-Regionen, Bauteil-Verweise, verankerte Pflicht-Prüfschritte, Overlay-Endpunkt (bereits vorgezogen, ADR 0006) |
| **Ausbau 1 – Baustellen-tauglich** | PWA/Offline-Warteschlange (V2-Erfahrung), Login, weitere Analysetypen (Feuchtigkeit, Risse) |
| **AR-Ausbaustufe** | AR-1 Markierungen im Foto → AR-2 Live-Kamera am Smartphone → AR-3 AR-Brille mit Sprachsteuerung → AR-4 räumliche Verankerung. Details: `06-ar-ausbaustufe.md` |

Die AR-Funktion ist zentraler Bestandteil der Sm@rtCraft-3.0-Vision. AR-1 baut nur auf
vorhandenen Daten auf und kann direkt nach dem MVP folgen; ab AR-2 werden Plattform- und
Kostenentscheidungen (E5, E6) vorher vorgelegt.

## Bewusst nicht im MVP

Login/Mehrbenutzer, Offline-Queue, TTS, Video-Suche, Kostenschätzung, Materialliste,
Standort, Teilen, Admin-Bereich, Deployment, AR-Clients (die AR-Datenbasis ist aber bereits angelegt).
