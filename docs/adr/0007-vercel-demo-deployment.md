# ADR 0007 – Erste Online-Version als geschützte Demo auf Vercel (flüchtiger Speicher)

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Marco möchte Sm@rtCraft 3.0 über Vercel erreichbar machen (E2). Das Backend speichert in
SQLite und im Dateisystem. Vercel-Funktionen haben kein dauerhaftes Dateisystem – nur `/tmp`,
das pro Funktionsinstanz existiert und jederzeit verworfen werden kann. Zur Wahl standen eine
sofort verfügbare Demo mit flüchtigem Speicher oder eine dauerhafte Speicherung über
zusätzliche Dienste (Postgres, Blob-Speicher).

## Entscheidung (Marco, 21.11.2026)

1. **Demo mit flüchtigem Speicher:** Datenbank und Fotos liegen in `/tmp`. Projekte und
   Analysen können jederzeit verschwinden (Kaltstart, neue Instanz, neues Deployment).
   `SMARTCRAFT_PERSISTENT_STORAGE=false`; `/health` meldet das, und die Oberfläche zeigt
   dauerhaft einen Demo-Hinweis (seit 21.11.2026 dezent in der Fußzeile statt als Banner).
2. **Nur für Marco:** Schutz per Vercel Authentication – nur Mitglieder seines Vercel-Teams
   kommen auf die Seite. Damit können keine Fremden Fotos hochladen.
3. **Ein Vercel-Projekt `smartcraft-v3`** für Frontend und Backend: Vite-Build als statische
   Seite, FastAPI als Python-Funktion `api/index.py` unter `/api` (gleiche Herkunft, kein
   CORS). Produktions-Deployment bei jedem Push auf `main`.
4. **Upload-Limit 4 MB** pro Anfrage (Vercel nimmt höchstens 4,5 MB an – in V2 als
   `FUNCTION_PAYLOAD_TOO_LARGE` aufgetreten). Ab Schritt 7 verkleinert der Client Fotos vor
   dem Hochladen, wie in V2.
5. **Weiterhin nur Mock-KI**, keine kostenpflichtigen Dienste. Python-Abhängigkeiten stehen in
   `requirements.txt` (aus `uv.lock` erzeugt, CI prüft den Gleichstand).

## Konsequenzen

- + Sofort online prüfbar, ohne weitere Dienste oder Kosten (Vercel Hobby).
- − Keine verlässliche Dokumentation online, solange der Speicher flüchtig ist. Für den
  echten Einsatz folgt dauerhafte Speicherung (z. B. Postgres + Blob-Speicher) als eigene
  Entscheidung.
- − Bei mehreren gleichzeitigen Funktionsinstanzen können Daten zwischen Anfragen
  „fehlen“. Für eine Ein-Personen-Demo akzeptiert.
