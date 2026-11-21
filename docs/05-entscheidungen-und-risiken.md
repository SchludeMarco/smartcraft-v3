# 05 – Offene Entscheidungen und Risiken

## Entscheidungen, die Marco treffen muss

| # | Entscheidung | Wann nötig | Vorschlag |
|---|---|---|---|
| E1 | **Echter KI-Provider** (Gemini, OpenAI, Anthropic, lokales Modell) und ob Kosten anfallen dürfen | vor Schritt 9 | Bis dahin nur Mock. Achtung: Bei Gratis-Stufen mancher Anbieter dürfen Eingaben zum Training genutzt werden – bei Kundenfotos kritisch. |
| E2 | **Hosting/Deployment** | nach MVP | Erst lokal; später kostenfreie Option prüfen und vorlegen |
| E3 | **Login & Mehrbenutzer** (wer nutzt V3: nur Marco, Familie/Freunde, Betriebe?) | nach MVP | Datenmodell ist mit `owner_id` vorbereitet |
| E4 | ~~Umfang Gewerke im MVP~~ | – | **Entschieden (21.11.2026):** alle Gewerke wie in V2 |

Alle übrigen technischen Entscheidungen (Stack, Struktur, Schema) sind in
`02-architektur.md` begründet und werden ohne Rückfrage umgesetzt.

## Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| KI erfindet Beschriftungen/Werte (z. B. falscher Bemessungsstrom) | Falsche Schlüsse auf der Baustelle | Jede Beschriftung mit Konfidenz; „nicht lesbar“ ist erlaubtes Ergebnis; Eval-Set misst Halluzinationen |
| KI suggeriert Sicherheit bei Elektro | Personenschaden, Haftung | Schema ohne Freigabefeld, deterministische Policy, Tests, fester Hinweis |
| Rechtlicher Rahmen (Haftung, EU AI Act, Produkthaftung) | Einschränkung der Nutzung | App als Assistenz kennzeichnen; vor öffentlichem Einsatz rechtlich prüfen lassen |
| Datenschutz: Fotos zeigen Personen, Adressen, Kundendaten | DSGVO-Verstoß | EXIF/GPS entfernen, lokale Ablage, Löschfunktion; Provider-Wahl mit Datenverarbeitungsbedingungen |
| Modell-Abschaltungen (in V2 dreimal passiert) | Ausfall | Modell nur in Konfiguration, Provider-Interface, Mock als Rückfallebene |
| Schlechte Fotos (Dunkelheit, Spiegelung, Schräglage) | Wertlose Analyse | `image_quality` im Schema, gezielte Rückmeldung „neues Foto mit …“ |
| Funkloch auf der Baustelle | Keine Analyse möglich | Nach MVP: PWA + Warteschlange (V2-Erfahrung nutzen) |
| Scope Creep wie in V2 | Wartungslast | MVP-Grenzen in `04-mvp-plan.md`, neue Features nur über den Plan |
