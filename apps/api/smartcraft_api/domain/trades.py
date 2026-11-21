"""Gewerke – derselbe Umfang wie in V2."""

from enum import StrEnum


class Trade(StrEnum):
    KLEMPNER = "klempner"
    ELEKTRIKER = "elektriker"
    MALER = "maler"
    TISCHLER = "tischler"
    ZIMMERER = "zimmerer"
    MECHANIKER = "mechaniker"
    MAURER = "maurer"
    DACHDECKER = "dachdecker"
    GAERTNER = "gaertner"
    ALLROUND = "allround"


TRADE_LABELS: dict[Trade, str] = {
    Trade.KLEMPNER: "Klempner (Sanitär/Heizung)",
    Trade.ELEKTRIKER: "Elektriker",
    Trade.MALER: "Maler",
    Trade.TISCHLER: "Tischler/Schreiner",
    Trade.ZIMMERER: "Zimmerer",
    Trade.MECHANIKER: "Mechaniker",
    Trade.MAURER: "Maurer",
    Trade.DACHDECKER: "Dachdecker",
    Trade.GAERTNER: "Gärtner",
    Trade.ALLROUND: "Allround-Handwerker",
}
