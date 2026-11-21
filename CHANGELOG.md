# Changelog

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
