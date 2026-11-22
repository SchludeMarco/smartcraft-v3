import type { Trade } from "../../api/types";

/**
 * Offline-Kurzhilfe aus V2 (`offlineQuickHelp.jsx`): fest hinterlegte Checklisten je Beruf,
 * komplett ohne KI und ohne Verbindung. Ersetzt keine Diagnose, überbrückt die Zeit bis
 * wieder Empfang da ist. Inhalte unverändert aus V2, Elektro um den Fachkraft-Hinweis ergänzt.
 */
export type QuickHelp = {
  items: { title: string; points: string[] }[];
  safety: string;
};

export const OFFLINE_QUICK_HELP: Record<Trade, QuickHelp> = {
  klempner: {
    items: [
      {
        title: "Rohrbruch / Wasseraustritt",
        points: [
          "Haupthahn sofort zudrehen.",
          "Bereich elektrisch spannungsfrei schalten, falls Wasser in Nähe von Steckdosen/Verteilern steht.",
          "Leckstelle eingrenzen (Muffe, Verschraubung, Frostschaden) und Auffangbehälter unterstellen.",
          "Betroffenen Bereich trockenlegen, bevor eine Verkleidung wieder geschlossen wird.",
        ],
      },
      {
        title: "Verstopfter Abfluss",
        points: [
          "Erst mechanisch (Spirale/Sauglocke) versuchen, dann erst Chemie.",
          "Siphon abschrauben und reinigen (Eimer unterstellen).",
          "Bei Küchenabfluss zuerst auf Fett-/Speisereste prüfen.",
        ],
      },
      {
        title: "Kein Warmwasser",
        points: [
          "Sicherung und FI-Schutzschalter des Geräts prüfen.",
          "Beim Boiler Thermostat und Reset-Taste prüfen.",
          "Beim Durchlauferhitzer den Mindestdurchfluss (Perlator/Ventil) kontrollieren.",
        ],
      },
    ],
    safety:
      "Bei Gasgeruch: sofort Gashahn zu, Fenster auf, KEINE Schalter betätigen, Bereich verlassen und Notruf/Netzbetreiber rufen.",
  },
  elektriker: {
    items: [
      {
        title: "Sicherung fällt sofort wieder raus",
        points: [
          "Betroffenen Stromkreis vor jedem erneuten Einschalten freischalten.",
          "Zuletzt angeschlossene Verbraucher abstecken und einzeln testen.",
          "Bei Schmorspuren oder Brandgeruch NICHT wieder einschalten — Fachmann rufen.",
        ],
      },
      {
        title: "FI-Schutzschalter löst aus",
        points: [
          "Alle Geräte am Kreis trennen, dann einzeln wieder zuschalten, um den Verursacher zu finden.",
          "Feuchtigkeit an Steckdosen/Geräten (z.B. nach Regen, Baustellenstrom) ist die häufigste Ursache.",
        ],
      },
      {
        title: "Stromausfall in einem Teilbereich",
        points: [
          "Nachbarhaus/Zähler prüfen, um Netzausfall von eigener Anlage zu unterscheiden.",
          "Vor jeder Arbeit an der Anlage: freischalten, gegen Wiedereinschalten sichern, Spannungsfreiheit mit Prüfer feststellen.",
        ],
      },
    ],
    safety:
      "Niemals unter Spannung arbeiten, niemals Sicherungsautomaten überbrücken oder manipulieren. Arbeiten an der Anlage nur durch eine Elektrofachkraft.",
  },
  maler: {
    items: [
      {
        title: "Abplatzende/blätternde Farbe",
        points: [
          "Ursache meist Feuchtigkeit im Untergrund — erst vollständig trocknen lassen.",
          "Lose Farbreste abschleifen/entfernen.",
          "Vor dem Neuanstrich Tiefgrund/Haftgrund auftragen.",
        ],
      },
      {
        title: "Schimmel an der Wand",
        points: [
          "NICHT einfach überstreichen.",
          "Ursache klären (Feuchte, Wärmebrücke, mangelnde Lüftung).",
          "Fläche mit geeignetem Mittel behandeln, gut trocknen und lüften, erst dann mit Schimmelschutzfarbe streichen.",
        ],
      },
      {
        title: "Risse im Putz vor dem Streichen",
        points: [
          "Feine Netzrisse mit Tiefgrund kaschieren.",
          "Breitere Risse auskratzen, spachteln, ggf. Armierungsgewebe einsetzen.",
          "Ausreichend trocknen lassen vor dem Anstrich.",
        ],
      },
    ],
    safety:
      "Bei Lösemittelfarben/Lacken in Innenräumen für Durchzug sorgen; bei Altanstrichen (vor 1990) vor dem Schleifen an möglichen Bleigehalt denken (Atemschutz).",
  },
  gaertner: {
    items: [
      {
        title: "Pflanze welkt/verfärbt sich",
        points: [
          "Erst Gießverhalten prüfen (Fingerprobe im Boden — zu viel oder zu wenig Wasser?).",
          "Standort auf Sonne/Schatten-Eignung prüfen.",
          "Blattunterseiten auf Schädlinge/Pilzbefall kontrollieren.",
        ],
      },
      {
        title: "Braune Flecken im Rasen",
        points: [
          "Gleichmäßige Flecken → meist Trockenstress.",
          "Runde, scharf abgegrenzte Flecken → möglicher Pilzbefall.",
          "Lässt sich der Rasen wie ein Teppich abrollen? → Schädlinge/Wurzelfraß.",
        ],
      },
      {
        title: "Baum-/Strauchschnitt",
        points: [
          "Starke Rückschnitte nur außerhalb der gesetzlichen Vogelschutzzeit (in Deutschland 1. März – 30. September eingeschränkt).",
          "Scharfes, desinfiziertes Werkzeug verwenden.",
        ],
      },
    ],
    safety:
      "Bei Arbeiten mit Motorsäge/Freischneider immer vollständige Schutzausrüstung (Schnittschutzhose, Helm mit Visier, Gehörschutz) tragen.",
  },
  zimmerer: {
    items: [
      {
        title: "Feuchte-/Fäulnisschaden am Holzbalken",
        points: [
          "Feuchtigkeitsquelle zuerst finden und stoppen (Dachundichtigkeit, Kondenswasser).",
          "Mit Klopfprobe/vorsichtigem Stechen prüfen, ob das Holz noch tragfähig ist.",
          "Bei tragenden Bauteilen vor dem Weiterbauen einen Statiker hinzuziehen.",
        ],
      },
      {
        title: "Risse im Balken/Sparren",
        points: [
          "Längsrisse durch Trocknung sind meist unkritisch.",
          "Querrisse oder Ausbrüche sind statisch relevant — Fachmann hinzuziehen.",
        ],
      },
      {
        title: "Ungeziefer im Holz (Bohrlöcher, Bohrmehl)",
        points: [
          "Helles, feines Bohrmehl deutet auf aktiven Befall hin (vs. altes, verstaubtes Bohrmehl).",
          "Bei Verdacht auf Hausbock/Holzwurm in tragenden Teilen fachliche Prüfung veranlassen.",
        ],
      },
    ],
    safety:
      "Bei Verdacht auf statisch relevante Schäden nicht selbst weiterbauen — Bereich sichern und Statiker/Bauleiter informieren.",
  },
  mechaniker: {
    items: [
      {
        title: "Motor springt nicht an",
        points: [
          "Batteriespannung und Polklemmen (sauber/fest) prüfen.",
          "Kraftstoffversorgung kontrollieren.",
          "Fehlercode-Speicher/Warnleuchten beachten.",
        ],
      },
      {
        title: "Ungewöhnliches Geräusch",
        points: [
          "Art des Geräuschs notieren (Klopfen, Quietschen, Schleifen).",
          "Situation notieren (beim Bremsen, Lenken, Beschleunigen) — hilft der späteren Diagnose enorm.",
        ],
      },
      {
        title: "Warnleuchte an",
        points: [
          "Symbol im Fahrzeug-Handbuch nachschlagen (meist offline im Fahrzeug vorhanden).",
          "Bei rotem Warnsymbol (Öldruck, Kühlwasser) sofort anhalten und Motor abstellen.",
        ],
      },
    ],
    safety:
      "Bei Arbeiten unter angehobenem Fahrzeug immer zusätzlich Unterstellböcke verwenden — nie nur auf den Wagenheber verlassen.",
  },
  maurer: {
    items: [
      {
        title: "Risse im Mauerwerk",
        points: [
          "Verlauf und Breite fotografisch dokumentieren, auch ohne Empfang möglich.",
          "Schräge Risse an Ecken (Setzungsrisse) von reinen Putzrissen unterscheiden.",
          "Bei durchgehenden, wachsenden Rissen einen Statiker hinzuziehen.",
        ],
      },
      {
        title: "Feuchte Wand/Mauerwerk",
        points: [
          "Unten breiter/dunkler → aufsteigende Feuchte.",
          "Nur wetterseitig → Schlagregen.",
          "In Ecken → meist Kondensation/Wärmebrücke.",
        ],
      },
      {
        title: "Mörtel/Verfugung bröckelt",
        points: [
          "Alte, lose Fugen mindestens auf doppelte Fugentiefe auskratzen.",
          "Fugen reinigen und anfeuchten, dann mit passendem Mörtel neu verfugen.",
        ],
      },
    ],
    safety:
      "Bei Verdacht auf tragende/statische Schäden Bereich absperren und nicht unter belasteten, rissigen Bauteilen aufhalten.",
  },
  dachdecker: {
    items: [
      {
        title: "Wassereintritt/undichte Stelle",
        points: [
          "Innen mit Eimer/Folie sichern.",
          "Wenn gefahrlos möglich: Notabdichtung außen (Dachfolie/Plane) anbringen.",
          "Genaue Position (Bezug zu Kamin/Fenster/First) für später dokumentieren.",
        ],
      },
      {
        title: "Lose/fehlende Dachziegel",
        points: [
          "Umliegende Ziegel auf Bruch/Verschiebung prüfen.",
          "Nur ohne Absturzgefahr provisorisch sichern — sonst Bereich absperren und Fachmann/Notdienst rufen.",
        ],
      },
      {
        title: "Verstopfte Dachrinne",
        points: [
          "Laub/Schmutz von der Mitte in Richtung Fallrohr entfernen.",
          "Gefälle und Befestigung der Rinne mitprüfen.",
        ],
      },
    ],
    safety:
      "Arbeiten auf dem Dach NIE ohne Absturzsicherung und nie bei Nässe, Glätte oder starkem Wind.",
  },
  tischler: {
    items: [
      {
        title: "Tür/Fenster klemmt",
        points: [
          "Scharniere auf Verzug/Lockerung prüfen.",
          "Falz auf Farbaufbau/Quellung kontrollieren.",
          "Saisonale Holzbewegung (Feuchtigkeit) ist im Sommer die häufigste Ursache.",
        ],
      },
      {
        title: "Möbel wackelt/hat Spiel",
        points: [
          "Verbindungen (Dübel, Schrauben, Leim) einzeln prüfen.",
          "Lockere Beschläge nachziehen.",
          "Gebrochene Holzverbindungen neu verleimen statt nur zu verschrauben.",
        ],
      },
      {
        title: "Kratzer/Beschädigung in der Oberfläche",
        points: [
          "Tiefe des Schadens einschätzen — nur Lack/Lasur oder bis ins Holz?",
          "Entscheidet über Ausbessern vs. komplettes Abschleifen.",
        ],
      },
    ],
    safety:
      "Bei Maschinenarbeit (Kreissäge, Fräse) immer Schutzvorrichtungen nutzen, nie mit Handschuhen an rotierenden Werkzeugen arbeiten.",
  },
  allround: {
    items: [
      {
        title: "Vor jeder Reparatur",
        points: [
          "Gefahr für Personen ausschließen (Strom, Wasser, Einsturz).",
          "Betroffenen Bereich sichern bzw. absperren.",
        ],
      },
      {
        title: "Ursache statt Symptom suchen",
        points: [
          "Wo und wann tritt das Problem auf?",
          "Was hat sich zuletzt verändert (Wetter, neue Geräte, Bauarbeiten in der Nähe)?",
        ],
      },
      {
        title: "Für später dokumentieren",
        points: [
          "Fotos, Ort, Uhrzeit und Wetter notieren.",
          "Sobald wieder Empfang da ist, liefert die volle KI-Analyse eine fundierte Diagnose dazu.",
        ],
      },
    ],
    safety:
      "Im Zweifel nichts überstürzen: Bereich sichern und auf einen Fachmann bzw. wieder Verbindung warten, statt ein Risiko einzugehen.",
  },
};
