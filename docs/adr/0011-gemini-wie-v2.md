# ADR 0011: Echter KI-Provider – Google Gemini wie in V2

- Status: angenommen (Freigabe Marco, 21.11.2026: „Einfach gleich wie in v2“)
- Bezug: ADR 0002 (Safety-Policy), ADR 0003 (Provider-Schnittstelle), ADR 0009 (Härtung)

## Kontext

Schritt 9 braucht einen echten Provider. V2 nutzt Google Gemini über die REST-API mit
`gemini-flash-lite-latest`. Dort dokumentierte Erfahrungen: datierte Modellnamen wurden
abgeschaltet, `gemini-flash-latest` hing zeitweise, `gemini-3.6-flash` war als
Thinking-Modell für das 30-s-Budget zu langsam; Flash-Lite antwortete in 0–3 s.

## Entscheidung

- `GeminiProvider` in `ai/gemini.py`, Modell standardmäßig `gemini-flash-lite-latest`
  (überschreibbar per `SMARTCRAFT_GEMINI_MODEL`).
- Aktiv nur mit `SMARTCRAFT_AI_PROVIDER=gemini` und gesetztem Schlüssel. Standard bleibt der Mock.
- Schlüssel: neuer Schlüssel des Betreibers als Vercel-Umgebungsvariable. Es wird nichts aus
  dem V2-Repo übernommen; der Schlüssel steht nie im Repo, geht im Header `x-goog-api-key`
  mit und erscheint nicht in Fehlermeldungen oder `repr(Settings)`.
- Prompt und Schema liegen versioniert im Backend (`PROMPT_VERSION`, sichtbar in
  `source.model_id`), nicht im Client wie in V2.
- JSON-Modus (`responseMimeType`), Temperatur 0,2. Das Schema steht im Prompt; die
  Antwort wird mit `extra="forbid"` geprüft. Keine automatischen Wiederholungen (Kosten).
- Die Safety-Policy bleibt die einzige Instanz für Risiko, Fachkraft-Pflicht und Hinweise.

## Folgen

- Kosten fallen über den Gemini-Schlüssel an; die Rate-Limits aus ADR 0009 bremsen.
  Empfehlung: Budget-Grenze im Google-Konto setzen.
- Fotos gehen an Google. Vorher werden EXIF/GPS entfernt (ADR 0005).
- Offen: Eval-Set mit 10–20 eigenen Fotos (Schemaquote, Policy-Eingriffe, Lesefehler).
