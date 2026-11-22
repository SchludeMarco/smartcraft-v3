# ADR 0009 – Härtung: Rate-Limit, Fehler-IDs, KI-Zeitlimit, Sicherheits-Header, Browser-Test

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Die Demo ist online. Mit einer echten KI verursacht jede Analyse Kosten; in V2 waren ein
offener Proxy, fehlende Zeitlimits und schwer auffindbare Fehler reale Probleme
(siehe `01-v2-analyse.md`).

## Entscheidung

1. **Rate-Limit** (gleitendes Fenster, `security/rate_limit.py`): Analysen pro Client und
   Minute/Tag, globale Tages-Kostenbremse, allgemeines Limit für schreibende Anfragen. Antwort
   429 mit `Retry-After` und verständlichem Text. Zähler im Speicher der Instanz – bewusst
   einfach für die Demo; Wechsel auf einen gemeinsamen Zähler mit dauerhafter Speicherung.
2. **Fehler-IDs:** Jede Antwort trägt `X-Request-ID`. Unerwartete Fehler liefern 500 ohne
   interne Details, aber mit Fehler-ID, die im Log mit Stacktrace steht.
3. **KI-Zeitlimit** (`SMARTCRAFT_AI_TIMEOUT_SECONDS`, Standard 25 s, seit 0.20.0 45 s) unterhalb
   der Laufzeitgrenze der Vercel-Funktion (seit 0.20.0 60 s); Überschreitung → 502, nichts wird gespeichert.
4. **Sicherheits-Header** auf Vercel inkl. Content-Security-Policy und Permissions-Policy.
5. **Browser-Test (Playwright)** des kompletten Ablaufs in der CI, inkl. Prüfung, dass
   ausgelieferte Fotos keine Standortdaten enthalten.

## Konsequenzen

- + Kosten und Missbrauch sind begrenzt, bevor eine echte KI angebunden wird.
- + Fehler sind über eine ID schnell auffindbar, ohne Interna preiszugeben.
- + Regressionen im Gesamtablauf fallen in der CI auf.
- − Rate-Limit pro Instanz ist nicht exakt; ausreichend für einen Nutzer, nicht für den
  öffentlichen Betrieb.
