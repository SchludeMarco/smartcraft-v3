# ADR 0013 – Dauerhafter Speicher: Postgres (Neon), Fotos in der Datenbank

- Status: angenommen (Entscheidung Marco, 22.11.2026: „Dauerhaft speichern“)
- Löst ab: Speicherteil von ADR 0007 (Demo mit /tmp)

## Kontext

Im Demo-Betrieb lag die SQLite-Datei in `/tmp` der jeweiligen Vercel-Instanz. Vercel verteilt
Aufrufe auf mehrere Instanzen; ein frisch angelegtes Projekt war beim nächsten Aufruf
„nicht gefunden“ (Screenshot Marco, 22.11.2026).

## Entscheidung

- **Datenbank:** Postgres bei Neon im kostenlosen Tarif, eingebunden über den Vercel-
  Marketplace. Die Integration setzt `DATABASE_URL`/`POSTGRES_URL`; die App liest beide.
  `postgres://…` wird auf den Treiber `postgresql+psycopg://` umgestellt.
- **Fotos in derselben Datenbank** (Tabelle `photo_blobs`, `SMARTCRAFT_STORAGE_BACKEND=database`)
  statt Vercel Blob: nur ein Dienst, keine öffentlichen Datei-URLs, Fotos sind nach der
  Bereinigung klein (≤ 1600 px). Bei starkem Wachstum später Objektspeicher hinter derselben
  `Storage`-Schnittstelle.
- `api/index.py` schaltet automatisch um, sobald eine Postgres-URL gesetzt ist; ohne bleibt der
  Demo-Betrieb mit Hinweis.
- Serverless: `NullPool` und `pool_pre_ping`, Neon übernimmt das Pooling.
- CI-Job `api-postgres` führt alle API-Tests zusätzlich gegen Postgres 16 aus.

## Folgen

- Kostenlos im Neon-Free-Tarif (Speicher begrenzt, reicht für viele hundert Analysen).
- Tabellen werden beim Start angelegt (`create_all`); Schemaänderungen brauchen ab jetzt
  Migrationen (Alembic), sobald sich bestehende Tabellen ändern.
- Das Rate-Limit bleibt pro Instanz im Speicher (ADR 0009).

## Umsetzung

- 22.11.2026: Neon-Datenbank `neon-bistre-canvas` (Free) über den Vercel-Marketplace angelegt und
  mit `smartcraft-v3` verbunden (Production, Preview, Development). Der zusätzlich angelegte
  Blob-Speicher `smartcraft-v3-blob` wird von der App nicht genutzt.
