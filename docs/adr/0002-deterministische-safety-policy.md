# ADR 0002 – Deterministische Safety-Policy nach jeder KI-Antwort

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Sm@rtCraft darf keine Sicherheitsfreigabe erteilen. In V2 war der Haftungshinweis nur
UI-Text; die KI konnte frei formulieren („die Installation ist sicher“). Ein Prompt allein
garantiert nichts, weil Modelle Anweisungen nicht zuverlässig befolgen und Modelle
wechseln.

## Entscheidung

1. Das Ergebnisschema (`domain/analysis.py`) hat kein Feld für Freigabe, Sicherheit oder
   Normkonformität. Provider-Ausgaben werden mit `extra="forbid"` validiert.
2. Nach jeder KI-Antwort läuft `safety/policy.py` – reiner Python-Code ohne KI:
   - Gefahren werden aus Gewerk, Modellangabe **und** Schlüsselwörtern erkannt
     (Elektro, Gas, Tragwerk, Höhe, Schadstoffe).
   - Je Gefahr gelten Mindest-Risikostufe, Fachkraft-Pflicht, Pflichthinweise und
     Pflicht-Prüfschritte (z. B. 5 Sicherheitsregeln, DIN VDE 0100-600).
   - Freigabe-Formulierungen werden neutralisiert und als Unsicherheit ausgewiesen.
   - Unbrauchbare Fotos senken die Konfidenz und verlangen ein neues Foto.
   - Haftungshinweis und Grund-Unsicherheit setzt immer der Server.
3. Die Policy darf nur verschärfen. Das ist durch Tests über alle Gewerke, Risikostufen und
   Gefahren abgesichert. Jeder Eingriff wird im Ergebnis protokolliert.
4. Fehlalarme (z. B. „Leiter“ als Höhenarbeit) sind bewusst in Kauf genommen.

## Konsequenzen

- + Sicherheitsgarantien hängen nicht vom Modell ab und sind testbar.
- + Transparenz: Nutzer sehen, wo die Policy eingegriffen hat.
- − Schlüsselwortlisten brauchen Pflege; neue Fehlalarme oder Lücken werden über Tests
  und das spätere Eval-Set (Schritt 9) nachgeschärft. Jede Änderung erhöht `POLICY_VERSION`.
