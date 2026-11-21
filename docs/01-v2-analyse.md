# 01 – Analyse von Sm@rtCraft V2 (Referenz)

Stand: 21.11.2026 · Quelle: `SchludeMarco/smartcraft-v2` @ `7505630` (V2.25.0), nur gelesen.
V2 dient ausschließlich als Referenz. Es wurde kein Code, keine Konfiguration und kein Secret übernommen.

## 1. Was V2 ist

Eine reine Web-App (PWA) „Kollege in der Hosentasche“: Gewerk wählen → bis zu 5 Fotos und/oder
Beschreibung → Gemini liefert eine **Freitext-Diagnose (Markdown)** → optional fünf
Zusatz-Tools (Materialliste, Sicherheits-Check, Kostenschätzung, Kundenbericht, Video-Suche)
und je Gewerk zwei Spezial-Tools (z. B. VDE-Check, Querschnitt-Rechner). Export als PDF über
`window.print()`, Teilen, Verlauf (letzte 20), Offline-Warteschlange, Standorterkennung,
TTS, Gästeliste, Admin-Bereich mit Fehlerreports.

## 2. Technologien

| Bereich | V2 |
|---|---|
| Frontend | React 19, Vite 8, Tailwind 4, lucide-react, vite-plugin-pwa, **JavaScript (kein TS)** |
| Backend | Vercel Serverless Functions (Node), dünner Proxy vor Gemini |
| KI | Google Gemini `gemini-flash-lite-latest` (Alias), Google Cloud TTS, Geocoding |
| Daten | Firebase Auth (Google-Login), Firestore, IndexedDB lokal |
| Schutz | Origin-Check, Firebase App Check (reCAPTCHA v3), IP-Rate-Limit, Gästeliste |
| Tests | Vitest, nur `api/*` (Rate-Limit, Token, Gäste, Geocode) – kein Frontend, keine KI-Logik |

## 3. Architektur und Datenmodell

- **Monolith im Frontend:** `src/App.jsx` hat ~4.000 Zeilen und enthält UI, Prompts,
  Geschäftslogik, Firestore-Zugriffe, Offline-Queue, TTS und PDF-Erzeugung.
- **Prompts liegen im Client.** Der Server (`api/gemini.js`) leitet den kompletten
  Request-Body unverändert an Gemini weiter. Der Client bestimmt also Modell-Input,
  System-Prompt und Tools – der Server kann keine Regeln durchsetzen.
- **Datenmodell (Firestore):** `artifacts/{appId}/users/{uid}/analyses/{id}` mit
  `selectedTrade`, `problemDescription`, `solutionText` (Markdown-String), optional
  `location`, `locationAddress`, `localAnalysisId`. Fotos werden **nicht** in der Cloud
  gespeichert, nur lokal in IndexedDB. Es gibt **kein Projekt-/Baustellenobjekt** –
  „Baustelle“ wird indirekt über GPS-Umkreis und Adressvergleich rekonstruiert.
- Der Pfad `artifacts/{appId}` ist ein Überbleibsel des Google-AI-Studio-Canvas-Exports.

## 4. Was gut ist und als Idee übernommen wird

| Idee aus V2 | Warum für V3 wertvoll |
|---|---|
| KI-Key nur serverseitig, Proxy davor | Pflicht, wird in V3 noch strenger (Server baut den Prompt selbst) |
| Bilder clientseitig verkleinern (max. ~1600 px, JPEG) | Hat in V2 echte Produktionsfehler gelöst (Payload-Limit) |
| Strukturierte Ausgabe per `responseSchema` (Materialliste) | Grundlage für V3: **jede** Analyse wird strukturiert |
| Gewerk als Kontext | In V3 als „Domäne“ (Elektro, Sanitär, Heizung …) |
| Offline-Gedanke (PWA, Warteschlange, statische Checklisten) | Baustelle = schlechter Empfang; kommt in V3 nach dem MVP |
| Sichtbarer KI-Haftungshinweis | In V3 nicht nur Text, sondern technisch erzwungen |
| Rate-Limit / Kostenbremse | Bei echter KI-Nutzung wieder nötig |
| Gewerks-Prompts (VDE-Check, TrinkwV …) | Inhaltliche Vorlage für spätere Domänen-Prompts |
| Doku-Disziplin (CHANGELOG, error_log, „Entstehung & Hürden“) | Wird übernommen, schlanker |

## 5. Bekannte Schwächen und technische Schulden

1. **Freitext statt Struktur:** Die Hauptdiagnose ist Markdown. Beobachtungen, Vermutungen,
   Unsicherheiten und Handlungsanweisungen sind nicht unterscheidbar, nicht auswertbar,
   nicht testbar.
2. **Sicherheitsrisiko im Prompt:** Der System-Prompt verlangt „präzise Diagnose sowie eine
   klare, schrittweise Lösung“. Das lädt das Modell ein, auch bei Elektro selbstsicher
   Anleitungen zu geben. Es gibt keine serverseitige Prüfung, ob eine Antwort eine
   unzulässige Freigabe enthält. Der Haftungshinweis ist reiner UI-Text.
3. **Client kontrolliert den KI-Aufruf** (siehe 3.) – jeder eingeladene Nutzer kann beliebige
   Prompts über den Proxy schicken.
4. **Kein Projekt-Begriff:** Analysen hängen nur am Nutzer; Dokumentation pro Baustelle fehlt.
5. **Fotos nicht Teil der Dokumentation** (nur lokal, ohne Obergrenze, gerätegebunden).
6. **4.000-Zeilen-Komponente, kein TypeScript**, kaum Tests außerhalb der API.
7. **Modell-Abhängigkeit:** Zwei Modell-Abschaltungen und ein hängender Alias haben V2
   mehrfach lahmgelegt; das Modell ist hart im Code verdrahtet.
8. **Free-Tier-Kontingent** (error_log #5, offen): 20 Requests projektweit.
9. **Starke Kopplung an Firebase/Google** (Auth, DB, App Check, TTS, Geocoding, Gemini).
10. **Feature-Breite vor Tiefe:** TTS, Video-Suche, Kostenschätzung, Standort usw. erzeugen
    Wartungslast, ohne die Kernanalyse zu verbessern.

## 6. Fazit für V3

V3 ist ein **Neubau**, kein Refactoring. Übernommen werden Erkenntnisse und einzelne Muster,
kein Code. Der Kern von V3 ist eine **strukturierte, serverseitig kontrollierte und
sicherheitsgeprüfte Analyse**, die einem **Projekt** zugeordnet ist. Alles andere
(TTS, Video, Kosten, Standort, Gästeliste, Admin) ist ausdrücklich nicht Teil des MVP.

Hinweis: Es gibt zusätzlich das Repo `smartcraft-baustellenanalyse` (zuletzt August 2026).
Es wurde in dieser Bestandsaufnahme nicht ausgewertet.
