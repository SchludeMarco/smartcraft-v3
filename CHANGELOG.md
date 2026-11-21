# Changelog

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
