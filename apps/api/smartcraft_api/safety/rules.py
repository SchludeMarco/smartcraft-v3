"""Regelinhalte der Safety-Policy: Erkennungsmuster, Pflicht-Prüfschritte, Texte.

Fehlalarme sind hier bewusst in Kauf genommen: Ein zu viel erkanntes Risiko verschärft
nur das Ergebnis, ein übersehenes Risiko kann Menschen gefährden.
"""

import re
from dataclasses import dataclass

from smartcraft_api.domain.analysis import Hazard, NextCheck, RiskLevel
from smartcraft_api.domain.trades import Trade

DISCLAIMER = (
    "KI-gestützte Ersteinschätzung auf Basis eines Fotos. Sie ersetzt keine Prüfung, "
    "Messung oder Abnahme durch eine qualifizierte Fachkraft und stellt keine "
    "Sicherheitsfreigabe dar."
)

BASELINE_UNCERTAINTY = (
    "Die Einschätzung beruht nur auf dem Foto: Verdeckte Bauteile, Messwerte, Funktion "
    "und Zustand hinter Abdeckungen wurden nicht geprüft."
)

APPROVAL_UNCERTAINTY = (
    "Ob die Anlage sicher, mängelfrei oder normgerecht ist, kann die KI nicht beurteilen; "
    "das kann nur eine Prüfung durch eine Fachkraft klären."
)

UNUSABLE_IMAGE_CHECK = NextCheck(
    action="Neues Foto aufnehmen: frontal, scharf, gut ausgeleuchtet, Beschriftungen lesbar",
    reason="Die Bildqualität reicht für eine belastbare Einschätzung nicht aus.",
    requires_qualified_person=False,
    source="policy",
)

# Steht vor der Lösung, sobald eine Fachkraft nötig ist (V2-Lösungsschritte bleiben sichtbar,
# aber niemand soll sie als Anleitung für Laien missverstehen).
QUALIFIED_SOLUTION_STEP = (
    "Achtung: Die folgenden Schritte nur durch eine qualifizierte Fachkraft ausführen lassen "
    "– siehe Sicherheitshinweise."
)

NO_PHOTO_UNCERTAINTY = (
    "Kein Foto: Die Einschätzung beruht nur auf der Beschreibung. Ein Foto der Problemstelle "
    "macht sie belastbarer."
)

NO_PHOTO_CHECK = NextCheck(
    action="Foto der Problemstelle aufnehmen und die Analyse wiederholen",
    reason="Ohne Foto kann nichts am tatsächlichen Zustand geprüft werden.",
    requires_qualified_person=False,
    source="policy",
)

TEST_DATA_PREFIX = "[TESTDATEN]"
TEST_DATA_NOTICE = (
    "TESTDATEN: Dieses Ergebnis stammt aus einem festen Beispielszenario der Mock-KI. "
    "Das Foto wurde NICHT ausgewertet. Nicht für Entscheidungen verwenden."
)

NEUTRALIZED = "[nicht durch KI beurteilbar]"

# Gewerke, bei denen eine Gefahr unabhängig vom Bildinhalt immer angenommen wird.
TRADE_HAZARDS: dict[Trade, frozenset[Hazard]] = {
    Trade.ELEKTRIKER: frozenset({Hazard.ELECTRICAL}),
    Trade.DACHDECKER: frozenset({Hazard.WORKING_AT_HEIGHT}),
}

_I = re.IGNORECASE

HAZARD_PATTERNS: dict[Hazard, re.Pattern[str]] = {
    Hazard.ELECTRICAL: re.compile(
        r"elektr|strom|spannung(?!sriss)|\bvolt\b|\d+\s?k?v\b|\bfi\b|\brcd\b|\brccb\b|"
        r"fehlerstrom|\bls[- ]?schalter|leitungsschutz|\bsicherung|schmelzeinsatz|\bnh\b|"
        # "Heizkreisverteiler" ist kein Elektroverteiler, daher Wortanfang bzw. Präfix
        r"\bverteiler|\bverteilung|unterverteil|hauptverteil|stromkreisverteil|zählerschrank|zählerplatz|steckdose|schalter|klemme|"
        r"\bnym\b|\bnyy\b|schutzleiter|\bpen\b|neutralleiter|\bphasen?\b|\bl[123]\b|"
        r"kabel|\badern?\b|wallbox|wechselrichter|photovoltaik|\bpv\b|netzteil|"
        r"trafo|transformator",
        _I,
    ),
    Hazard.GAS: re.compile(r"\bgas|gastherme|abgas|\bdvgw|trgi|brenner", _I),
    Hazard.STRUCTURAL: re.compile(
        r"tragend|statik|\briss|setzung|durchbieg|\bsturz\b|unterzug|"
        r"(dach|decken|holz)balken|sparren|pfette|stütze|fundament|abplatz",
        _I,
    ),
    Hazard.WORKING_AT_HEIGHT: re.compile(
        r"\bdach\b|dachfläche|gerüst|absturz|\bleiter\b|hubarbeitsbühne|traufe|first", _I
    ),
    Hazard.HAZARDOUS_MATERIAL: re.compile(
        r"asbest|eternit|\bkmf\b|künstliche mineralfaser|\bpak\b|teer|\bpcb\b|"
        r"schimmel|bleirohr|bleileitung",
        _I,
    ),
}


@dataclass(frozen=True)
class HazardRule:
    min_risk: RiskLevel
    qualified_person_required: bool
    notices: tuple[str, ...]
    checks: tuple[NextCheck, ...]


def _check(action: str, reason: str, qualified: bool, reference: str | None = None) -> NextCheck:
    return NextCheck(
        action=action,
        reason=reason,
        requires_qualified_person=qualified,
        reference=reference,
        source="policy",
    )


HAZARD_RULES: dict[Hazard, HazardRule] = {
    Hazard.ELECTRICAL: HazardRule(
        min_risk=RiskLevel.HIGH,
        qualified_person_required=True,
        notices=(
            "Elektrische Anlage: Arbeiten und Bewertung ausschließlich durch eine "
            "Elektrofachkraft. Lebensgefahr durch elektrischen Schlag.",
        ),
        checks=(
            _check(
                "Vor jeder Arbeit die fünf Sicherheitsregeln anwenden: freischalten, gegen "
                "Wiedereinschalten sichern, Spannungsfreiheit allpolig feststellen, erden und "
                "kurzschließen, benachbarte unter Spannung stehende Teile abdecken",
                "Ein Foto zeigt nicht, ob Teile unter Spannung stehen.",
                True,
                "DIN VDE 0105-100",
            ),
            _check(
                "Prüfung der Anlage durch eine Elektrofachkraft (Sichtprüfung, Messungen, "
                "Erprobung) und Dokumentation im Prüfprotokoll",
                "Schutzmaßnahmen und Normkonformität lassen sich nur durch Messung belegen.",
                True,
                "DIN VDE 0100-600",
            ),
        ),
    ),
    Hazard.GAS: HazardRule(
        min_risk=RiskLevel.HIGH,
        qualified_person_required=True,
        notices=(
            "Gasanlage: Arbeiten nur durch ein beim Netzbetreiber eingetragenes "
            "Installationsunternehmen. Bei Gasgeruch keine Schalter betätigen, Absperrhahn "
            "schließen, Gebäude verlassen und den Entstördienst des Gasversorgers rufen.",
        ),
        checks=(
            _check(
                "Gebrauchsfähigkeits- bzw. Dichtheitsprüfung durch ein eingetragenes "
                "Installationsunternehmen",
                "Undichtigkeiten sind auf einem Foto nicht erkennbar.",
                True,
                "DVGW-TRGI",
            ),
        ),
    ),
    Hazard.STRUCTURAL: HazardRule(
        min_risk=RiskLevel.MEDIUM,
        qualified_person_required=True,
        notices=(
            "Mögliche Auswirkung auf die Tragfähigkeit: keine Eingriffe in tragende Bauteile "
            "ohne fachliche Beurteilung.",
        ),
        checks=(
            _check(
                "Beurteilung durch Tragwerksplaner oder Sachverständigen, bevor tragende "
                "Bauteile bearbeitet oder belastet werden",
                "Tragfähigkeit und Ursache von Schäden sind auf einem Foto nicht bestimmbar.",
                True,
            ),
        ),
    ),
    Hazard.WORKING_AT_HEIGHT: HazardRule(
        min_risk=RiskLevel.MEDIUM,
        qualified_person_required=False,
        notices=(
            "Arbeiten in der Höhe: Absturzsicherung (Gerüst, Seitenschutz oder PSA gegen "
            "Absturz mit geprüftem Anschlagpunkt) vor Beginn sicherstellen.",
        ),
        checks=(
            _check(
                "Absturzsicherung und Zugang planen und vor Arbeitsbeginn prüfen",
                "Absturz ist eine der häufigsten Ursachen schwerer Unfälle am Bau.",
                False,
                "DGUV Information 201-054",
            ),
        ),
    ),
    Hazard.HAZARDOUS_MATERIAL: HazardRule(
        min_risk=RiskLevel.HIGH,
        qualified_person_required=True,
        notices=(
            "Verdacht auf Schadstoffe: Material nicht bohren, schleifen oder brechen, bis "
            "der Verdacht geklärt ist.",
        ),
        checks=(
            _check(
                "Materialprobe durch Sachkundigen entnehmen und im Labor analysieren lassen",
                "Schadstoffe wie Asbest sind optisch nicht sicher erkennbar.",
                True,
                "TRGS 519 (bei Asbest)",
            ),
        ),
    ),
}

# Formulierungen, die eine Freigabe oder Sicherheitsaussage suggerieren.
APPROVAL_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, _I)
    for p in (
        # "ist sicher." ja, "ist sicher falsch angeschlossen" (= sicherlich) nein
        r"\b(ist|sind|wirkt|wirken|scheint|scheinen)\s+(absolut\s+|völlig\s+|vollkommen\s+|"
        r"komplett\s+)?(sicher|unbedenklich|ungefährlich|gefahrlos|mängelfrei|einwandfrei)\b"
        r"(?=\s*(?:[.,;:!)]|$|und\b|sowie\b|zu\b))",
        r"\b(bedenkenlos|gefahrlos|ohne\s+bedenken)\b",
        r"\bkann\s+(sicher|problemlos|direkt)\s+(in\s+betrieb|eingeschaltet|genutzt|"
        r"benutzt|betrieben)",
        r"\b(freigegeben|freigabe\s+erteilt|abnahmefähig|betriebsbereit)\b",
        r"\b(normgerecht|normkonform|vorschriftsmäßig|vorschriftsgemäß|vde-konform)\b",
        r"\bentspricht\s+(den|der|allen)\s+(normen?|vorschriften?|vde|din|regeln)",
        r"\b(keine|keinerlei)\s+(gefahr|gefährdung|risiken?|mängel)\b",
        r"\bkein\s+(risiko|mangel|handlungsbedarf)\b",
    )
)
