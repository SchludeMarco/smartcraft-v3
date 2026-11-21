# ADR 0010 – Gestaltung als Weiterentwicklung von V2

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Die erste V3-Oberfläche war technisch neu, sah aber völlig anders aus als Sm@rtCraft V2.
Marco wünscht sich, dass V3 erkennbar eine Weiterentwicklung von V2 ist.

## Entscheidung

Die Gestaltung von V2 wird übernommen und für die neuen Funktionen fortgeführt
(Code-Struktur bleibt V3):

- Farben und Bausteine aus V2 `src/index.css`: dunkelblauer Hintergrund, blaue Kopfleiste
  mit Glanzstreifen und Stahlblau-Linie, Pergament-Panels, grüne Schritt-Labels
  (`badge-pill`), grüner Haupt-Button (`btn-quest`), Pergament- und Stahl-Buttons.
- Logo (Hammer mit Blitz), Schriftzug „Sm@rt**Craft**!“ in Cinzel, Untertitel
  „Der Kollege in der Hosentasche.“, Favicons aus V2.
- Berufswahl als farbige Kacheln mit Icons und den Gewerk-Farben aus V2
  (`TRADE_THEMES`); die Akzentfarbe des gewählten Gewerks färbt Seite und Ergebnis.
- Ablauf in nummerierten Schritten wie in V2: „1. Beruf auswählen“,
  „2. Problem dokumentieren & analysieren“, „3. Ergebnis der KI-Analyse“.
- Cinzel wird **lokal** eingebunden (`@fontsource/cinzel`) statt über Google Fonts – kein
  externer Request, passt zur Content-Security-Policy und funktioniert offline.
- Sicherheitsinformationen (roter Sicherheitsblock, Testdaten-Hinweise) bleiben bewusst
  auffälliger als die Dekoration.

## Konsequenzen

- + V3 wirkt wie die nächste Version derselben App.
- + Gestaltungsbausteine sind zentral in `apps/web/src/index.css` und `lib/trades.tsx`.
- − Darstellung (Icons, Farben) je Gewerk liegt im Client; Gewerk-Liste und Namen kommen
  weiterhin aus dem Backend (`/meta/trades`).
