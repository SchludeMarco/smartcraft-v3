# ADR 0003 – Provider-Schnittstelle und Mock-KI mit erzwungener Testdaten-Kennzeichnung

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Bis zur Freigabe eines echten KI-Anbieters (E1) muss der komplette Analyse-Ablauf
kostenlos, lokal und reproduzierbar laufen. Gleichzeitig darf ein Mock-Ergebnis nie mit
einer echten Analyse verwechselt werden. In V2 war das Modell hart im Code verdrahtet.

## Entscheidung

1. **Schnittstelle** `AnalysisProvider` (`ai/provider.py`): `info` (Provider, Modell,
   `is_test_data`) und `async analyze(AnalysisRequest) -> AnalysisDraft`. Modellausgaben
   werden mit `parse_draft()` streng gegen das Schema validiert.
2. **Einziger Ablauf** `run_analysis()` (`services/analysis_service.py`): Eingabe prüfen →
   Provider → Schema erneut prüfen → Safety-Policy. Kein Ergebnis umgeht die Policy.
3. **Mock-KI** (`ai/mock.py`): drei feste JSON-Szenarien (Unterverteilung mit FI,
   Heizungsanlage, unbrauchbares Foto). Auswahl über `[mock:<id>]` in der Notiz oder
   reproduzierbar über den SHA-256 des ersten Fotos. Kein Netzwerkzugriff (per Test
   abgesichert). Die Szenarien enthalten bewusst typische Modellschwächen, damit die
   Policy-Verschärfung nachweisbar ist.
4. **Testdaten-Kennzeichnung erzwingt der Server**, nicht der Mock: Das Ergebnis trägt
   `source.is_test_data = true`, die Policy setzt `[TESTDATEN]` vor die Zusammenfassung und
   einen Testdaten-Hinweis an die erste Stelle von Unsicherheiten und Sicherheitshinweisen.
   Schema 1.1.0 (`source`), Policy 1.1.x.

## Konsequenzen

- + Frontend und API können vollständig ohne Kosten entwickelt und getestet werden.
- + Echte Provider lassen sich später ergänzen, ohne Service, Policy oder UI zu ändern.
- − Die Kennzeichnung hängt an `ProviderInfo.is_test_data`; jeder neue Provider muss das
  korrekt setzen (Code-Review-Punkt).
