# 05 – Offene Entscheidungen und Risiken

## Entscheidungen, die Marco treffen muss

| # | Entscheidung | Wann nötig | Vorschlag |
|---|---|---|---|
| E1 | **Echter KI-Provider** (Gemini, OpenAI, Anthropic, lokales Modell) und ob Kosten anfallen dürfen | vor Schritt 9 | Bis dahin nur Mock. Achtung: Bei Gratis-Stufen mancher Anbieter dürfen Eingaben zum Training genutzt werden – bei Kundenfotos kritisch. |
| E2 | ~~Hosting/Deployment~~ | – | **Entschieden (21.11.2026):** geschützte Vercel-Demo mit flüchtigem Speicher (ADR 0007); dauerhafte Speicherung folgt als eigene Entscheidung |
| E3 | **Login & Mehrbenutzer** (wer nutzt V3: nur Marco, Familie/Freunde, Betriebe?) | nach MVP | Datenmodell ist mit `owner_id` vorbereitet |
| E4 | ~~Umfang Gewerke im MVP~~ | – | **Entschieden (21.11.2026):** alle Gewerke wie in V2 |

| E5 | **AR-Plattform** (WebXR, native App, bestimmte Brille; KI in der Cloud oder auf dem Gerät) | vor AR-2 | offen, siehe `06-ar-ausbaustufe.md` |
| E6 | **Räumliche Anker** lokal oder als (oft kostenpflichtiger) Cloud-Dienst | vor AR-4 | offen |

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
| AR-Einblendungen lenken bei gefährlichen Arbeiten ab | Unfallrisiko | Einblendungen nur auf Abfrage, Sicherheitsblock immer sichtbar, kein „Grün = sicher“ (`06-ar-ausbaustufe.md`) |
| Falsch verortete Bauteile in AR | Prüfschritt am falschen Gerät | Positionsqualität im Eval-Set messen; unsichere Zuordnung kennzeichnen |
| Dauerkamera der AR-Brille | Datenschutz (Personen, Kundendaten) | Nur bewusst ausgelöste Captures analysieren, kein Dauer-Upload |
| Scope Creep wie in V2 | Wartungslast | MVP-Grenzen in `04-mvp-plan.md`, neue Features nur über den Plan |
