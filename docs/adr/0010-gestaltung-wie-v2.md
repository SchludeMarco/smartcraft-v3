# ADR 0010 – Gestaltung als Weiterentwicklung von V2

- Status: abgelöst durch ADR 0012 (2026-11-22)
- Datum: 2026-11-21

## Kontext

Die erste V3-Oberfläche war technisch neu, sah aber völlig anders aus als Sm@rtCraft V2.
Marco wünscht sich, dass V3 erkennbar eine Weiterentwicklung von V2 ist.

## Entscheidung

**Aufbau und Elemente aus V2, Farbgebung professionell und schlicht** (Rückmeldung Marco,
21.11.2026: Header in Lila-Blau, App insgesamt professionell und schlicht, Buttons und
Fensterflächen poliert und edel):

- Aus V2 übernommen: Kopfleiste mit Logo (Hammer + Blitz), Schriftzug „Sm@rt**Craft**!“ in
  Cinzel, Untertitel „Der Kollege in der Hosentasche.“, Favicons; Ablauf in nummerierten
  Schritten („1. Beruf auswählen“, „2. Problem dokumentieren & analysieren“,
  „3. Ergebnis der KI-Analyse“); Berufswahl als farbige Kacheln mit Icons und den
  Gewerkfarben aus V2.
- Neu: Kopfleiste in Lila-Blau mit dezentem Glanz, tiefes Indigo als Seitenhintergrund,
  helle, ruhige Fensterflächen mit feinem Rahmen und weichem Schatten, polierte Buttons
  (Indigo-Verlauf mit Lichtkante), neutrale Schiefergrau-Texte, schlichte Sans-Serif für
  Überschriften. Der Pergament-/Spiel-Look aus V2 entfällt.
- Bausteine zentral in `apps/web/src/index.css` (`header-brand`, `surface-panel`,
  `surface-card`, `step-badge`, `btn-primary`, `btn-secondary`, `btn-dark`, `field`) und
  `lib/trades.tsx`.
- Cinzel nur für den Schriftzug, **lokal** eingebunden (`@fontsource/cinzel`) – kein
  externer Request, CSP-konform, offline.
- Sicherheitsinformationen (Sicherheitsblock, Testdaten-Hinweise) bleiben deutlich
  hervorgehoben.

## Konsequenzen

- + V3 wirkt wie die nächste Version derselben App.
- + Gestaltungsbausteine sind zentral in `apps/web/src/index.css` und `lib/trades.tsx`.
- − Darstellung (Icons, Farben) je Gewerk liegt im Client; Gewerk-Liste und Namen kommen
  weiterhin aus dem Backend (`/meta/trades`).
