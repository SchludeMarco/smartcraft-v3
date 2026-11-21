# ADR 0005 – Bildpipeline: jedes Foto wird neu kodiert, Originale werden nie gespeichert

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Baustellenfotos vom Smartphone enthalten EXIF-Metadaten, oft mit GPS-Position (= Adresse
des Kunden), Gerätedaten und Aufnahmezeit. In V2 sprengten unverkleinerte Handyfotos
außerdem Upload-Limits. Fotos sollen später an externe KI-Anbieter gehen können.

## Entscheidung

1. **Jedes Foto wird vollständig neu als JPEG kodiert** (`media/processing.py`):
   Format nach Dateiinhalt prüfen (JPEG/PNG/WebP), EXIF-Drehung anwenden, auf max. 1600 px
   verkleinern, ohne Metadaten speichern. Damit entfallen EXIF/GPS, XMP und ICC sicher,
   statt einzelne Felder zu löschen.
2. **Originaldateien werden nie gespeichert und nie an einen Provider übergeben** – nur die
   bereinigten Bilder. Per Test belegt (Spy-Provider).
3. **Grenzen:** Dateigröße (Standard 15 MB, nur bis knapp über das Limit eingelesen),
   Auflösung (Standard 50 MP, Schutz vor Dekompressionsbomben), max. 5 Fotos.
4. **Ablage** über eine `Storage`-Schnittstelle, lokal mit serverseitig erzeugten
   UUID-Dateinamen; fremde Keys (z. B. `../`) werden abgewiesen.
5. **Keine verwaisten Dateien:** Schlägt die KI-Analyse fehl, wird nichts gespeichert;
   schlägt das Speichern in der DB fehl, werden bereits geschriebene Dateien gelöscht.
   Beim Löschen eines Projekts werden auch die Dateien entfernt.

## Konsequenzen

- + Keine Standortdaten in Ablage, Auslieferung oder an KI-Anbieter.
- + Kleine Dateien (typisch 10–300 KB) – schnell auch bei schlechtem Empfang.
- − Neu-Kodierung kostet minimal Bildqualität; 1600 px reichten in V2 für Beschriftungen.
  Falls das Eval-Set (Schritt 9) zeigt, dass kleine Typenschilder unlesbar werden, wird
  `SMARTCRAFT_MAX_IMAGE_EDGE` angehoben.
- − Sichtbare personenbezogene Inhalte (Gesichter, Namensschilder) bleiben im Bild; das
  löst diese Pipeline nicht.
