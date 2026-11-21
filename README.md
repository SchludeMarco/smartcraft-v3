# Sm@rtCraft 3.0 – Der Kollege in der Hosentasche

KI-Assistent für Handwerker auf der Baustelle: Installationen, Feuchtigkeitsschäden, Risse,
Bauteile. Langfristig ein multimodaler Assistent für **Smartphone und AR-Brillen**: Bauteile
werden im Sichtfeld erkannt und beschriftet, Prüfschritte und technische Informationen
erscheinen direkt an der Installation. Entwickelt wird Smartphone-first; Analyse- und
Sicherheitslogik sind von Anfang an geräteunabhängig (siehe
[AR-Ausbaustufe](docs/06-ar-ausbaustufe.md)).

**Status:** MVP-Schritte 1–8 und 10 (Härtung) umgesetzt; Schritt 9 (echte KI) wartet auf Anbieterentscheidung. KI: nur Mock.

## Erste Ausbaustufe: Installation Analyzer

1. Foto einer Installation aufnehmen
2. KI erkennt sichtbare Bauteile und Beschriftungen
3. Strukturierte Beobachtungen, Auffälligkeiten und Unsicherheiten
4. Konkrete nächste Prüfschritte
5. Ablage und Dokumentation im Projekt

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
| POST | `/projects/{id}/analyses` | Fotos hochladen und analysieren (multipart: `trade`, `files`, `note`) |
| GET | `/analyses/{id}` | Analyse mit Ergebnis, Fotos und Prüfschritten |
| GET | `/analyses/{id}/captures/{capture_id}/image` | Bereinigtes Foto (ohne Metadaten) |
| PATCH | `/analyses/{id}/checks/{check_id}` | Prüfschritt dokumentieren (ändert nie das KI-Ergebnis) |
| GET / POST | `/projects/{id}/notes` | Projektnotizen |
| DELETE | `/projects/{id}/notes/{note_id}` | Notiz löschen |
| GET | `/projects/{id}/report` | Projektbericht mit Haftungshinweis |
| GET | `/meta/trades` | Gewerke mit Anzeigenamen |
| GET | `/analyses/{id}/overlay` | Geräteunabhängige Einblendungs-Sicht (Markierungen, später AR) mit Pflicht-Sicherheitsblock |

Beispiel mit der Mock-KI:

```bash
curl -F trade=elektriker -F 'note=[mock:unterverteilung]' -F files=@foto.jpg \
  http://localhost:8000/projects/<projekt-id>/analyses
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
