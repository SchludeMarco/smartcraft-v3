# ADR 0001 – Neubau statt Migration von V2

- Status: angenommen
- Datum: 2026-11-21

## Kontext

V2 ist eine funktionsreiche React-PWA mit dünnem Gemini-Proxy. KI-Logik und Prompts liegen im
Client, die Hauptanalyse ist Freitext, es gibt kein Projektmodell, und `App.jsx` umfasst
~4.000 Zeilen ohne Typisierung (Details: `docs/01-v2-analyse.md`).

## Entscheidung

V3 wird neu aufgebaut: FastAPI-Backend, das KI-Aufrufe, Schema und Safety-Policy besitzt,
plus typisierter React-Client. Aus V2 werden Erkenntnisse und Muster übernommen
(Bildverkleinerung, serverseitiger Key, strukturierte Ausgabe, Offline-Konzept), kein Code.

## Konsequenzen

- + Sicherheitsregeln sind serverseitig durchsetzbar und testbar.
- + Analysen sind strukturiert, auswertbar und projektbezogen.
- + KI-Anbieter austauschbar, kein Ausfall bei Modell-Abschaltung.
- − Funktionen aus V2 (TTS, Video, Kosten, Offline-Queue …) müssen bei Bedarf neu gebaut werden.
- − Zweite Laufzeitumgebung (Python) neben dem Frontend.
