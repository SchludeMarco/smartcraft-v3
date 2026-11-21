# ADR 0008 – Dokumentation durch den Menschen: Prüfschritte, Notizen, Projektbericht

- Status: angenommen
- Datum: 2026-11-21

## Kontext

Analysen sollen einem Projekt zugeordnet und dokumentiert werden (MVP-Ziel 6). Abgehakte
Prüfschritte und ein Bericht können leicht wie eine „Freigabe“ wirken – das darf Sm@rtCraft
nicht erzeugen.

## Entscheidung

1. **Prüfschritte abhaken** (`PATCH /analyses/{id}/checks/{check_id}`): Status `open | done |
   not_applicable`, Person, Zeitpunkt (vom Server), Kommentar.
   - `done`/`not_applicable` brauchen einen Namen.
   - `not_applicable` braucht eine Begründung.
   - Bei Schritten mit Fachkraft-Pflicht verlangt `done` die ausdrückliche Bestätigung, dass eine
     Fachkraft ihn ausgeführt hat (`qualified_person_confirmed`). Die Bestätigung wird
     dokumentiert, nicht überprüft.
   - Regeln prüft das Backend (`domain/documentation.py`), das Frontend zeigt nur an.
2. **Abhaken ändert nie das KI-Ergebnis**, die Risikostufe, die Fachkraft-Pflicht oder das
   Overlay (per Test belegt). Die Oberfläche sagt das ausdrücklich.
3. **Projektnotizen** (`/projects/{id}/notes`): freier Text mit optionalem Autor; endgültig
   löschbar.
4. **Projektbericht** (`GET /projects/{id}/report`, Web: `/projects/{id}/report`):
   Haftungshinweis als Pflichtfeld und an erster Stelle, Zusammenfassung (höchstes Risiko,
   Fachkraft-Pflicht, Testdaten, Stand der Prüfschritte inkl. offener Fachkraft-Schritte), je
   Analyse Sicherheitsblock, Fotos, Auffälligkeiten, Prüfschritt-Dokumentation,
   Unsicherheiten; Notizen. PDF über den Druckdialog des Browsers – keine PDF-Bibliothek,
   keine Kosten.
5. Der Bericht verwendet nie Formulierungen wie „abgenommen“ oder „freigegeben“.

## Konsequenzen

- + Nachvollziehbare Dokumentation pro Baustelle, ohne Freigabe-Anschein.
- − Ohne Login (E3) ist der eingetragene Name nicht verifiziert; er ist eine Angabe der Person.
- − Im Vercel-Demo-Betrieb (ADR 0007) ist auch die Dokumentation flüchtig.
