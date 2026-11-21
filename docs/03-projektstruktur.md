# 03 – Projektstruktur (Vorschlag)

Monorepo mit klar getrennten Apps. Keine gemeinsamen Code-Pakete zwischen Python und TS –
der Vertrag ist das OpenAPI-Schema.

```
smartcraft-v3/
├── README.md
├── CLAUDE.md                     # Arbeitsregeln für KI-gestützte Entwicklung
├── CHANGELOG.md
├── docs/
│   ├── 01-v2-analyse.md
│   ├── 02-architektur.md
│   ├── 03-projektstruktur.md
│   ├── 04-mvp-plan.md
│   ├── 05-entscheidungen-und-risiken.md
│   ├── 06-ar-ausbaustufe.md
│   └── adr/                      # Architecture Decision Records
├── apps/
│   ├── api/                      # FastAPI-Backend
│   │   ├── pyproject.toml
│   │   ├── smartcraft_api/
│   │   │   ├── main.py           # App-Factory, Router-Registrierung
│   │   │   ├── config.py         # Settings (pydantic-settings, .env)
│   │   │   ├── api/routes/       # health, projects, analyses
│   │   │   ├── domain/           # Pydantic-Schemas (AnalysisResult, Overlay für AR …)
│   │   │   ├── services/         # analysis_service: Pipeline-Orchestrierung
│   │   │   ├── safety/           # policy.py, rules/, Versionskonstante
│   │   │   ├── ai/
│   │   │   │   ├── provider.py   # Protocol AnalysisProvider
│   │   │   │   ├── mock.py       # deterministisch, Fixtures
│   │   │   │   └── prompts/      # installation_v1.md (versioniert)
│   │   │   ├── media/            # Validierung, EXIF-Strip, Resize, Storage
│   │   │   └── persistence/      # SQLAlchemy-Tabellen, Repository, Session
│   │   └── tests/                # unit/, api/, fixtures/
│   └── web/                      # React-Client
│       ├── package.json
│       ├── src/
│       │   ├── api/              # generierte Typen + Client
│       │   ├── features/projects/
│       │   ├── features/analysis/  # Capture, Ergebnisansicht, Prüfschritte
│       │   ├── components/       # UI-Bausteine
│       │   └── app/              # Routing, Layout
│       └── tests/
├── evals/                        # Testbilder + Erwartungen für echte Modelle (später)
└── .github/workflows/ci.yml
```

## Regeln

- Kein Feature-Code in `App.tsx`; jedes Feature in `features/<name>`.
- Keine Prompts im Frontend.
- Keine Secrets im Repo; `.env.example` dokumentiert alle Variablen.
- Jede Änderung an Schema, Prompt oder Safety-Policy erhöht deren Versionsnummer.
