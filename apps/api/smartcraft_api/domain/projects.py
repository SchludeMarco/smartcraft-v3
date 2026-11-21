"""Eingabemodelle für Projekte (Baustellen/Aufträge)."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _strip(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    client: str | None = Field(default=None, max_length=200, description="Auftraggeber")
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name darf nicht leer sein")
        return value

    @field_validator("address", "client", "description")
    @classmethod
    def _strip_optional(cls, value: str | None) -> str | None:
        return _strip(value)


class ProjectUpdate(BaseModel):
    """Nur gesetzte Felder werden geändert; `null` leert ein optionales Feld."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = Field(default=None, max_length=300)
    client: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Name darf nicht entfernt werden")
        value = value.strip()
        if not value:
            raise ValueError("Name darf nicht leer sein")
        return value

    @field_validator("address", "client", "description")
    @classmethod
    def _strip_optional(cls, value: str | None) -> str | None:
        return _strip(value)
