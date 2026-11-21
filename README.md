# Sm@rtCraft 3.0 – Der Kollege in der Hosentasche

KI-Assistent für Handwerker auf der Baustelle: Installationen, Feuchtigkeitsschäden, Risse,
Bauteile. Langfristig multimodal (Smartphone, später AR-Brille).

**Status:** MVP-Schritt 4 – Projekte und Datenspeicherung (KI: nur Mock).

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
| GET | `/analyses/{id}` | Analyse mit Ergebnis, Fotos und Prüfschritten |

Konfiguration über Umgebungsvariablen, siehe `apps/api/.env.example`. Standard-KI ist ein
kostenloser Mock.
