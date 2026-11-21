"""Tabellen.

Projekt 1─n Analyse 1─n Foto (Capture)
                    1─n Prüfschritt (CheckItem)

Das vollständige Analyseergebnis liegt unverändert als JSON in `analyses.result`.
Einige Felder sind zusätzlich als Spalten abgelegt, damit Listen ohne JSON-Parsing
auskommen. Prüfschritte sind eigene Zeilen, weil Menschen sie abhaken und kommentieren –
das ist Dokumentation durch den Handwerker und ändert das KI-Ergebnis nie.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from smartcraft_api.persistence.db import Base, UTCDateTime, utcnow


def new_id() -> str:
    return str(uuid.uuid4())


class ProjectRow(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(300))
    client: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    # Vorbereitet für Mehrbenutzerbetrieb (E3); im MVP leer.
    owner_id: Mapped[str | None] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    analyses: Mapped[list["AnalysisRow"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AnalysisRow.created_at.desc()",
    )
    notes: Mapped[list["ProjectNoteRow"]] = relationship(
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ProjectNoteRow.created_at.desc()",
    )


class AnalysisRow(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    trade: Mapped[str] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(Text)

    # Vollständiges, policy-geprüftes Ergebnis (AnalysisResult als JSON)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    schema_version: Mapped[str] = mapped_column(String(16))
    policy_version: Mapped[str] = mapped_column(String(16))
    provider_id: Mapped[str] = mapped_column(String(64))
    model_id: Mapped[str] = mapped_column(String(128))
    is_test_data: Mapped[bool] = mapped_column(Boolean)
    risk_level: Mapped[str] = mapped_column(String(16))
    qualified_person_required: Mapped[bool] = mapped_column(Boolean)

    project: Mapped[ProjectRow] = relationship(back_populates="analyses")
    captures: Mapped[list["CaptureRow"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="CaptureRow.position"
    )
    checks: Mapped[list["CheckItemRow"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="CheckItemRow.position"
    )


class CaptureRow(Base):
    """Ein Foto (später auch Video-Frame, Audio-Notiz …). Die Datei liegt im Storage."""

    __tablename__ = "captures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    media_type: Mapped[str] = mapped_column(String(64))
    sha256: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class CheckItemRow(Base):
    """Prüfschritt aus dem Ergebnis, den ein Mensch abarbeitet und dokumentiert."""

    __tablename__ = "check_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    analysis_id: Mapped[str] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text)
    requires_qualified_person: Mapped[bool] = mapped_column(Boolean)
    reference: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(16))
    # Bauteile (Index in result.components), an denen der Schritt auszuführen ist – Anker für AR
    component_indices: Mapped[list[int]] = mapped_column(JSON, default=list)
    # open | done | not_applicable – gesetzt ausschließlich durch einen Menschen
    status: Mapped[str] = mapped_column(String(16), default="open")
    completed_by: Mapped[str | None] = mapped_column(String(200))
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    comment: Mapped[str | None] = mapped_column(Text)
    # Nur bei Schritten mit Fachkraft-Pflicht: dokumentierte Bestätigung durch den Menschen
    qualified_person_confirmed: Mapped[bool | None] = mapped_column(Boolean)


class ProjectNoteRow(Base):
    """Freie Notiz zum Projekt (Dokumentation durch den Handwerker)."""

    __tablename__ = "project_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
