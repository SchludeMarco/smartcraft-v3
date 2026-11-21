"""Dokumentation durch den Menschen: Prüfschritte abhaken, Projektnotizen.

Grundsatz: Diese Angaben ändern NIE das KI-Ergebnis, die Risikostufe oder die Fachkraft-Pflicht.
Ein abgehakter Prüfschritt bedeutet „jemand hat dokumentiert, dass er ihn ausgeführt hat“ –
keine Freigabe durch Sm@rtCraft.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CheckStatus = Literal["open", "done", "not_applicable"]


def _strip(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class CheckUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: CheckStatus
    completed_by: str | None = Field(default=None, max_length=200, description="Name der Person")
    comment: str | None = Field(default=None, max_length=2000)
    qualified_person_confirmed: bool | None = Field(
        default=None,
        description="Bestätigung, dass eine qualifizierte Fachkraft den Schritt ausgeführt hat",
    )

    @field_validator("completed_by", "comment")
    @classmethod
    def _strip_text(cls, value: str | None) -> str | None:
        return _strip(value)


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=2000)
    author: str | None = Field(default=None, max_length=200)

    @field_validator("text")
    @classmethod
    def _text_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Notiz darf nicht leer sein")
        return value

    @field_validator("author")
    @classmethod
    def _strip_author(cls, value: str | None) -> str | None:
        return _strip(value)


REPORT_DISCLAIMER = (
    "Dieser Bericht dokumentiert KI-gestützte Ersteinschätzungen und die von Personen "
    "eingetragenen Prüfschritte. Er ist keine Sicherheitsfreigabe, kein Prüfprotokoll nach "
    "Norm und ersetzt keine Prüfung, Messung oder Abnahme durch eine qualifizierte Fachkraft."
)


class DocumentationError(ValueError):
    """Dokumentationsregel verletzt (z. B. Fachkraft-Bestätigung fehlt)."""


def validate_check_update(update: CheckUpdate, *, requires_qualified_person: bool) -> None:
    if update.status == "open":
        return
    if not update.completed_by:
        raise DocumentationError("Bitte angeben, wer den Prüfschritt dokumentiert.")
    if update.status == "not_applicable" and not update.comment:
        raise DocumentationError("Bitte begründen, warum der Prüfschritt nicht zutrifft.")
    if (
        update.status == "done"
        and requires_qualified_person
        and update.qualified_person_confirmed is not True
    ):
        raise DocumentationError(
            "Dieser Prüfschritt darf nur von einer Fachkraft ausgeführt werden. "
            "Bitte bestätigen, dass eine Fachkraft ihn durchgeführt hat."
        )
