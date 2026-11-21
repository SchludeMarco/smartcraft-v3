# Arbeitsregeln für Sm@rtCraft 3.0

## Grenzen (nicht verhandelbar ohne ausdrückliche Zustimmung von Marco)

- Keine kostenpflichtigen APIs, Dienste oder Deployments.
- Das Repo `smartcraft-v2` ist nur Referenz: nicht ändern, nichts veröffentlichen,
  keine Zugangsdaten/Secrets daraus verwenden.
- Keine Secrets im Repo. Neue Umgebungsvariablen in `.env.example` dokumentieren.

## Sicherheitsregeln für KI-Ausgaben

- Das Ergebnisschema enthält niemals Felder für Freigabe, „sicher“ oder Normkonformität.
- Jede KI-Antwort läuft durch `safety/policy.py`. Die Policy darf verschärfen, nie entschärfen.
- Elektro ⇒ `qualified_person_required = true` und Pflicht-Prüfschritte.
- Prompts, Schema und Policy sind versioniert; jede Änderung erhöht die Version und hat Tests.

## Arbeitsweise

- Kleine, überprüfbare Schritte entlang `docs/04-mvp-plan.md`, je Schritt ein PR.
- Commit-Stil: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Vor jedem Commit: Tests, Linter, Typprüfung grün.
- Architekturentscheidungen als ADR in `docs/adr/`; `CHANGELOG.md` pflegen.
- Keine Prompts oder KI-Logik im Frontend.
