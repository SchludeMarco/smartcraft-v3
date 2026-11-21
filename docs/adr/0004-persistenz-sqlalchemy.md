# ADR 0004 – Persistenz mit SQLAlchemy 2 und SQLite, Ergebnis als geprüftes JSON

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Analysen müssen einem Projekt zugeordnet und dokumentiert werden. Geplant war SQLModel
(ADR-freie Annahme in `02-architektur.md`). Das Projekt nutzt `mypy --strict`.

## Entscheidung

1. **SQLAlchemy 2 (typisierte `Mapped[]`-Modelle) statt SQLModel.** SQLAlchemy 2 arbeitet
   zuverlässig mit `mypy --strict`; API-Modelle bleiben getrennte Pydantic-Klassen. So
   bleiben Datenbank- und API-Vertrag unabhängig voneinander änderbar.
2. **SQLite lokal** (`SMARTCRAFT_DATABASE_URL`), Tests mit In-Memory-DB. Wechsel auf
   Postgres ist eine Konfigurationsänderung. Alembic-Migrationen folgen, sobald das Schema
   stabil ist; bis dahin `create_all`.
3. **Datenmodell:** Projekt 1─n Analyse 1─n Foto (Capture) und 1─n Prüfschritt (CheckItem).
4. **Das Ergebnis wird vollständig als JSON gespeichert** und beim Lesen erneut streng
   gegen `AnalysisResult` validiert – kaputte oder manipulierte Daten fallen auf. Nur
   Ergebnisse der aktuellen Policy-Version werden gespeichert. Risikostufe, Fachkraft-Pflicht
   und Testdaten-Kennzeichen liegen zusätzlich als Spalten für Listen vor.
5. **Prüfschritte sind eigene Zeilen** mit Status `open | done | not_applicable`, Person,
   Zeitpunkt, Kommentar. Das ist Dokumentation durch den Menschen und verändert das
   KI-Ergebnis nie.
6. **Löschen ist endgültig** (Kaskade), weil Fotos personenbezogene Daten enthalten können.
   `delete_project` liefert die Storage-Keys, damit ab Schritt 5 auch die Dateien gelöscht
   werden.
7. Zeitstempel immer UTC und zeitzonenbewusst.

## Konsequenzen

- + Typsicher, testbar, später ohne Umbau auf Postgres.
- + Ergebnis bleibt exakt so erhalten, wie es die Policy erzeugt hat.
- − Schemaänderungen am Ergebnis brauchen später eine Migrationsstrategie für alte JSONs
  (Versionsfeld `schema_version` ist vorhanden).
