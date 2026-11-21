# ADR 0006 – AR-fähige Architektur: geräteunabhängiges Backend, Positionsdaten, Overlay

- Status: angenommen
- Datum: 2026-11-21

## Kontext

AR-Brillen mit kontextbezogenen Einblendungen sind ein zentraler Teil der Sm@rtCraft-Vision
(Wunsch Marco, 21.11.2026). Entwickelt wird zunächst Smartphone-first. Ohne frühe Vorsorge
würden Ergebnisdaten und API auf eine Smartphone-Oberfläche zugeschnitten und müssten für AR
später umgebaut werden – mit dem Risiko, dass Sicherheitslogik doppelt entsteht.

## Entscheidung

1. **Ein Backend, mehrere Clients.** Analyse, Schema und Safety-Policy bleiben ausschließlich
   im Backend. Web und spätere AR-Clients sind gleichrangige Konsumenten derselben API.
2. **Positionsdaten im Ergebnisschema (1.2.0):** optionale `Component.region`
   (normierte Koordinaten je Foto) sowie `component_indices` an Auffälligkeiten und
   Prüfschritten. Das Schema prüft, dass Verweise auf existierende Bauteile zeigen; der
   Analyse-Ablauf prüft, dass Regionen auf existierende Fotos zeigen.
3. **Policy 1.2.0 verankert Pflicht-Prüfschritte** an den Bauteilen, an denen sie die Gefahr
   erkannt hat (z. B. VDE-Prüfung am FI). Wird eine Gefahr nur über das Gewerk erkannt,
   bleibt der Schritt allgemein.
4. **Overlay-Schnittstelle** `GET /analyses/{id}/overlay` (Format 1.0.0): reine Ableitung
   aus dem gespeicherten, geprüften Ergebnis. Der Sicherheitsblock ist Pflichtfeld; kein
   Prüfschritt und keine Auffälligkeit geht verloren (per Test belegt).
5. **Keine AR-SDKs, Hardware-Abhängigkeiten oder kostenpflichtigen Dienste** in dieser
   Phase. Plattformfragen sind als E5/E6 offen.

## Konsequenzen

- + AR-1 (Markierungen im Foto) ist ohne Backend-Änderung möglich.
- + Smartphone und AR zeigen garantiert dieselben Sicherheitsaussagen.
- − Echte Modelle müssen künftig Bauteilpositionen liefern; die Qualität dieser Positionen
  wird Teil des Eval-Sets (Schritt 9).
- − Die lokale SQLite-Datei muss nach diesem Update neu angelegt werden (neue Spalte
  `check_items.component_indices`; Migrationen folgen mit Alembic).
