# Sm@rtCraft 3.0 – Der Kollege in der Hosentasche

KI-Assistent für Handwerker auf der Baustelle: Installationen, Feuchtigkeitsschäden, Risse,
Bauteile. Langfristig multimodal (Smartphone, später AR-Brille).

**Status:** Phase 0 – Bestandsaufnahme und Architektur abgeschlossen, Implementierung folgt.

## Erste Ausbaustufe: Installation Analyzer

1. Foto einer Installation aufnehmen
2. KI erkennt sichtbare Bauteile und Beschriftungen
3. Strukturierte Beobachtungen, Auffälligkeiten und Unsicherheiten
4. Konkrete nächste Prüfschritte
5. Ablage und Dokumentation im Projekt

> Sm@rtCraft erteilt **keine** Sicherheitsfreigaben. Bei elektrischen Installationen weist
> jede Analyse Risiken, Unsicherheiten und die Pflicht zur Prüfung durch eine
> Elektrofachkraft aus.

## Dokumentation

- [01 – Analyse V2](docs/01-v2-analyse.md)
- [02 – Architektur V3](docs/02-architektur.md)
- [03 – Projektstruktur](docs/03-projektstruktur.md)
- [04 – MVP-Plan](docs/04-mvp-plan.md)
- [05 – Entscheidungen und Risiken](docs/05-entscheidungen-und-risiken.md)
- [ADRs](docs/adr/)

## Tech-Stack (geplant)

FastAPI + Pydantic + SQLModel (Backend) · React + TypeScript + Vite + Tailwind (Web) ·
austauschbarer KI-Provider mit Mock als Standard.
