# 06 – AR-Ausbaustufe

Sm@rtCraft 3.0 ist langfristig ein **multimodaler Handwerker-Assistent** – nicht nur eine
Smartphone-App. Die AR-Funktion ist zentraler Bestandteil der Vision. Die Entwicklung bleibt
vorerst **Smartphone-first** mit dem Installation Analyzer; die Architektur ist aber von Anfang
an so angelegt, dass AR-Brillen ein weiterer Client derselben Analyse- und Sicherheitslogik
werden.

## Zielbild

Ein Handwerker steht vor einer Unterverteilung. Durch die AR-Brille sieht er:

- **Bauteile erkannt und beschriftet** – „FI-Schutzschalter 40 A / 30 mA Typ A“ direkt am Gerät
- **Auffälligkeiten markiert** – „Offene Teilungseinheit ohne Blindabdeckung“ am betroffenen Feld
- **Prüfschritte an der Installation** – „Prüfung nach DIN VDE 0100-600 durch Elektrofachkraft“
  am FI, abhakbar per Sprache oder Geste
- **Sicherheitsrahmen immer sichtbar** – Risikostufe, Fachkraft-Pflicht, Haftungshinweis,
  ggf. „Testdaten“
- **Kontextbezogene technische Informationen** – z. B. Datenblatt-Kerndaten zu erkannten Typen

## Architekturprinzipien für AR (gelten ab sofort)

| Prinzip | Umsetzung heute |
|---|---|
| **Analyse-Backend und Oberfläche sind getrennt** | Alle KI-Aufrufe, Prompts, das Schema und die Safety-Policy liegen im Backend. Clients (Web heute, AR später) zeigen nur an. |
| **Eine Analyse- und Sicherheitslogik für alle Clients** | Es gibt genau einen Weg zu einem Ergebnis (`run_analysis` → `apply_safety_policy`). Ein AR-Client bekommt dieselben, bereits geprüften Ergebnisse. |
| **Strukturierte Bauteil- und Positionsdaten** | `Component.region` (normierte Bildkoordinaten je Foto), `Finding.component_indices`, `NextCheck.component_indices`. Die Policy verankert ihre Pflicht-Prüfschritte an den Bauteilen, an denen sie die Gefahr erkannt hat. |
| **Geräteunabhängige Einblendungs-Schnittstelle** | `GET /analyses/{id}/overlay` liefert Anker (Bauteil + Region + Beschriftungen + Auffälligkeiten + Prüfschritte) und einen **Pflicht-Sicherheitsblock**. |
| **Keine Bindung an eine Smartphone-Oberfläche** | Eingaben heißen „Captures“ (heute Foto, später Kamera-Frame der Brille, Sprachnotiz). Die API kennt keine Bildschirmgrößen, Touch-Gesten oder Layouts. |
| **Keine Hardware- oder Kostenbindung jetzt** | Kein AR-SDK, keine Cloud-Anker, keine kostenpflichtigen Dienste. Alles bis AR-1 läuft im Browser. |

## Datenmodell für Einblendungen

```text
AnalysisOverlay (Version 1.0.0)
  safety            Pflicht: risk_level, qualified_person_required, hazards, notices,
                    disclaimer, is_test_data
  anchors[]         je verortetem Bauteil:
    component_index, name, category
    region          { capture_index, x, y, width, height }   # 0..1, Ursprung oben links
    labels[]        gelesene Beschriftungen mit Konfidenz
    highest_severity
    findings[]      betroffene Auffälligkeiten
    checks[]        Prüfschritte an diesem Bauteil (position = CheckItem.position)
  general_findings[] / general_checks[]   nicht verortbar – gehen nie verloren
```

Die Region bezieht sich heute auf das bereinigte Foto. Für AR kommt später eine
**räumliche Verankerung** hinzu (Kamerapose bzw. 3D-Anker); das Overlay-Format wird dafür
versioniert erweitert, nicht ersetzt.

## Sicherheitsregeln speziell für AR

Einblendungen im Sichtfeld sind sicherheitskritischer als ein Bericht auf dem Handy:

1. **Kein „Grün = sicher“.** Es gibt keine Einblendung, die eine Anlage als sicher, geprüft
   oder freigegeben darstellt – das Schema kennt solche Aussagen nicht.
2. **Sicherheitsblock nicht ausblendbar.** Ein AR-Client muss Risiko und Fachkraft-Pflicht
   permanent sichtbar halten, sobald Bauteil-Anker angezeigt werden.
3. **Ablenkung vermeiden.** Keine Animationen oder Pop-ups während der Arbeit; Einblendungen
   erst nach bewusster Abfrage (Sprache/Geste). Vor Arbeiten an elektrischen Anlagen steht
   der Hinweis auf die fünf Sicherheitsregeln vor jeder anderen Einblendung.
4. **Unsicherheit sichtbar machen.** Beschriftungen mit niedriger Konfidenz werden als
   unsicher gekennzeichnet (z. B. „B1? – nicht sicher lesbar“).
5. **Datenschutz bei Dauerkamera.** Kein Dauer-Upload; nur bewusst ausgelöste Captures
   werden analysiert. Personen im Bild bleiben ein offener Punkt (siehe ADR 0005).

## Ausbaustufen

| Stufe | Inhalt | Plattform | Kosten / Abhängigkeiten |
|---|---|---|---|
| **AR-0 – Datenfundament** ✅ | Regionen, Bauteil-Verweise, verankerte Pflicht-Prüfschritte, Overlay-Endpunkt | Backend | keine |
| **AR-1 – Markierungen im Foto** | Ergebnisansicht zeigt Rahmen und Beschriftungen auf dem Foto; Antippen eines Bauteils zeigt dessen Prüfschritte | Web/Smartphone | keine |
| **AR-2 – Live-Kamera am Smartphone** | Kamerabild mit Einblendungen; Analyse auf Knopfdruck, Anker folgen dem Bild | Browser (WebXR, wo verfügbar) oder native App | Entscheidung E5 |
| **AR-3 – AR-Brille** | Freihändige Nutzung, Sprachsteuerung, Prüfschritte im Sichtfeld abhaken | AR-Brille | Entscheidung E5, ggf. Hardware/SDK |
| **AR-4 – Räumliche Verankerung** | Bauteile bleiben im Raum markiert und werden bei erneutem Besuch der Baustelle wiedergefunden | Gerät + Backend | Entscheidung E6 |

AR-1 kann direkt nach dem MVP folgen, weil es ausschließlich auf vorhandenen Daten aufbaut.
Ab AR-2 sind Plattform- und ggf. Kostenentscheidungen nötig – diese werden vorher vorgelegt.

## Offene Entscheidungen (später)

- **E5 – AR-Plattform:** WebXR im Browser vs. native App vs. bestimmte Brillen-Plattform;
  KI-Auswertung in der Cloud vs. auf dem Gerät (Latenz, Offline, Datenschutz).
- **E6 – Räumliche Anker:** lokal auf dem Gerät vs. geteilte Anker (häufig kostenpflichtige
  Cloud-Dienste – nur nach Zustimmung).
