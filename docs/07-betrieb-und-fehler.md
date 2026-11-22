# 07 – Betrieb und Fehlerübersicht

## Fehlerantworten der API

Alle Fehler kommen als JSON mit `detail` (verständlicher deutscher Text). Jede Antwort trägt
eine `X-Request-ID`; bei unerwarteten Fehlern steht sie zusätzlich als `error_id` im Text.

| Status | `code` | Bedeutung | Was der Nutzer sieht | Was tun |
|---|---|---|---|---|
| 404 | – | Projekt, Analyse, Foto, Prüfschritt oder Notiz nicht gefunden | „… nicht gefunden“ | Im Demo-Betrieb normal nach Neustart (flüchtiger Speicher) |
| 413 | – | Upload größer als Vercels Grenze (4,5 MB) | „Die Fotos sind zusammen zu groß …“ | Weniger Fotos; Client verkleinert ohnehin auf 1600 px |
| 422 | – | Ungültige Eingabe, ungültiges Bild, Dokumentationsregel verletzt | Text aus `detail` | Eingabe korrigieren |
| 429 | `rate_limited` | Rate-Limit oder Tageslimit erreicht; `Retry-After` in Sekunden | „Zu viele … Bitte in N Sekunden erneut versuchen.“ | Warten; Limits ggf. per Variable anpassen |
| 500 | `internal_error` | Unerwarteter Fehler; keine internen Details nach außen | „Interner Fehler … (Fehler-ID …)“ | Fehler-ID in den Vercel-Logs suchen |
| 502 | – | KI-Provider fehlgeschlagen, Zeitüberschreitung oder ungültige KI-Antwort; es wird nichts gespeichert | „KI-Analyse fehlgeschlagen …“ | Erneut versuchen; bei Häufung Provider prüfen |

## Fehler finden

1. Fehler-ID aus der Meldung bzw. `X-Request-ID` notieren.
2. Vercel → Projekt `smartcraft-v3` → Logs, nach der ID suchen. Der Log-Eintrag enthält
   Methode, Pfad und den vollständigen Stacktrace.

## Grenzen (Umgebungsvariablen)

| Variable | Standard | Wirkung |
|---|---|---|
| `SMARTCRAFT_RATE_ANALYSES_PER_MINUTE` | 10 | Analysen pro Client und Minute |
| `SMARTCRAFT_RATE_ANALYSES_PER_DAY` | 200 | Analysen pro Client und Tag |
| `SMARTCRAFT_MAX_ANALYSES_PER_DAY` | 500 | Kostenbremse: Analysen pro Tag insgesamt |
| `SMARTCRAFT_RATE_WRITES_PER_MINUTE` | 120 | Übrige schreibende Anfragen pro Client |
| `SMARTCRAFT_AI_TIMEOUT_SECONDS` | 45 | Maximale Dauer eines KI-Aufrufs inkl. Wiederholungen (Vercel-Limit 60 s) |
| `SMARTCRAFT_MAX_UPLOAD_MB` | 15 (Vercel: 4) | Maximale Dateigröße je Foto |

Lesende Anfragen sind nicht begrenzt. Client = erste IP in `X-Forwarded-For` (von Vercel
gesetzt). **Einschränkung:** Die Zähler liegen im Speicher der jeweiligen Funktionsinstanz.
Bei mehreren Vercel-Instanzen gilt das Limit pro Instanz. Mit dauerhafter Speicherung
wandern die Zähler in die Datenbank (wie in V2 über einen gemeinsamen Zähler).

## Sicherheits-Header (Vercel)

`Content-Security-Policy` (nur eigene Skripte, keine Einbettung in fremde Seiten),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
`Permissions-Policy` (Kamera nur für die eigene Seite – Grundlage für spätere AR-Stufen).

## Automatische Prüfungen (CI)

| Job | Inhalt |
|---|---|
| `api` | ruff, mypy (strict), pytest, `requirements.txt` und `openapi.json` aktuell |
| `web` | generierte Typen aktuell, ESLint, TypeScript, Vitest, Build |
| `e2e` | Playwright im echten Chromium (Smartphone-Ansicht): Projekt → Foto → Analyse → Prüfschritt mit Fachkraft-Bestätigung → Notiz → Bericht; Foto wird ohne Standortdaten ausgeliefert |

Lokal: `cd apps/web && npm run e2e` (startet Backend und Frontend selbst). Ohne
Playwright-Browser: `CHROME_PATH=/pfad/zu/chrome npm run e2e`.
