"""Datenzugriff. Routen und Services greifen nur hierüber auf die Datenbank zu."""

from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from smartcraft_api.domain.analysis import AnalysisResult
from smartcraft_api.domain.documentation import CheckUpdate, NoteCreate, validate_check_update
from smartcraft_api.domain.projects import ProjectCreate, ProjectUpdate
from smartcraft_api.persistence.db import utcnow
from smartcraft_api.persistence.models import (
    AnalysisRow,
    CaptureRow,
    CheckItemRow,
    ProjectNoteRow,
    ProjectRow,
)
from smartcraft_api.safety import POLICY_VERSION


@dataclass(frozen=True)
class StoredCapture:
    """Metadaten eines bereits gespeicherten Fotos (Datei liegt im Storage)."""

    storage_key: str
    media_type: str
    sha256: str
    size_bytes: int
    width: int | None = None
    height: int | None = None


# --- Projekte ----------------------------------------------------------------------


def create_project(session: Session, data: ProjectCreate) -> ProjectRow:
    row = ProjectRow(**data.model_dump())
    session.add(row)
    session.commit()
    return row


def list_projects(session: Session) -> list[tuple[ProjectRow, int]]:
    counts = (
        select(AnalysisRow.project_id, func.count(AnalysisRow.id).label("n"))
        .group_by(AnalysisRow.project_id)
        .subquery()
    )
    stmt = (
        select(ProjectRow, func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.project_id == ProjectRow.id)
        .order_by(ProjectRow.updated_at.desc(), ProjectRow.created_at.desc())
    )
    return [(row, int(n)) for row, n in session.execute(stmt).all()]


def get_project(session: Session, project_id: str) -> ProjectRow | None:
    return session.get(ProjectRow, project_id)


def count_analyses(session: Session, project_id: str) -> int:
    stmt = select(func.count(AnalysisRow.id)).where(AnalysisRow.project_id == project_id)
    return int(session.scalar(stmt) or 0)


def update_project(session: Session, row: ProjectRow, data: ProjectUpdate) -> ProjectRow:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    session.commit()
    return row


def delete_project(session: Session, row: ProjectRow) -> list[str]:
    """Löscht Projekt samt Analysen. Liefert die Storage-Keys der Fotos zum Entfernen."""
    keys = list(
        session.scalars(
            select(CaptureRow.storage_key)
            .join(AnalysisRow, CaptureRow.analysis_id == AnalysisRow.id)
            .where(AnalysisRow.project_id == row.id)
        )
    )
    session.delete(row)
    session.commit()
    return keys


# --- Analysen ----------------------------------------------------------------------


def save_analysis(
    session: Session,
    project: ProjectRow,
    result: AnalysisResult,
    captures: Sequence[StoredCapture],
    note: str | None = None,
) -> AnalysisRow:
    """Speichert ein policy-geprüftes Ergebnis inkl. Fotos und Prüfschritten."""
    if result.policy.version != POLICY_VERSION:
        raise ValueError("Ergebnis wurde nicht mit der aktuellen Safety-Policy erzeugt")
    row = AnalysisRow(
        project_id=project.id,
        trade=result.trade.value,
        note=note,
        result=result.model_dump(mode="json"),
        schema_version=result.schema_version,
        policy_version=result.policy.version,
        provider_id=result.source.provider_id,
        model_id=result.source.model_id,
        is_test_data=result.source.is_test_data,
        risk_level=result.safety.risk_level.value,
        qualified_person_required=result.safety.qualified_person_required,
        captures=[
            CaptureRow(
                position=i,
                storage_key=c.storage_key,
                media_type=c.media_type,
                sha256=c.sha256,
                size_bytes=c.size_bytes,
                width=c.width,
                height=c.height,
            )
            for i, c in enumerate(captures)
        ],
        checks=[
            CheckItemRow(
                position=i,
                action=check.action,
                reason=check.reason,
                requires_qualified_person=check.requires_qualified_person,
                reference=check.reference,
                source=check.source,
                component_indices=list(check.component_indices),
            )
            for i, check in enumerate(result.next_checks)
        ],
    )
    now = utcnow()
    row.created_at = now
    project.updated_at = now
    session.add(row)
    session.commit()
    return row


def list_analyses(session: Session, project_id: str) -> list[AnalysisRow]:
    stmt = (
        select(AnalysisRow)
        .where(AnalysisRow.project_id == project_id)
        .order_by(AnalysisRow.created_at.desc())
    )
    return list(session.scalars(stmt))


def get_analysis(session: Session, analysis_id: str) -> AnalysisRow | None:
    return session.get(AnalysisRow, analysis_id)


def load_result(row: AnalysisRow) -> AnalysisResult:
    """Gespeichertes Ergebnis wieder streng validieren (erkennt kaputte/manipulierte Daten)."""
    return AnalysisResult.model_validate(row.result)


# --- Dokumentation -----------------------------------------------------------------


def get_check(session: Session, analysis_id: str, check_id: str) -> CheckItemRow | None:
    check = session.get(CheckItemRow, check_id)
    return check if check is not None and check.analysis_id == analysis_id else None


def update_check(session: Session, check: CheckItemRow, update: CheckUpdate) -> CheckItemRow:
    """Dokumentiert einen Prüfschritt. Ändert nie das gespeicherte KI-Ergebnis."""
    validate_check_update(update, requires_qualified_person=check.requires_qualified_person)
    check.status = update.status
    if update.status == "open":
        check.completed_by = None
        check.completed_at = None
        check.comment = None
        check.qualified_person_confirmed = None
    else:
        check.completed_by = update.completed_by
        check.completed_at = utcnow()
        check.comment = update.comment
        check.qualified_person_confirmed = (
            update.qualified_person_confirmed if check.requires_qualified_person else None
        )
    session.commit()
    return check


def create_note(session: Session, project: ProjectRow, data: NoteCreate) -> ProjectNoteRow:
    note = ProjectNoteRow(project_id=project.id, text=data.text, author=data.author)
    project.updated_at = utcnow()
    session.add(note)
    session.commit()
    return note


def list_notes(session: Session, project_id: str) -> list[ProjectNoteRow]:
    stmt = (
        select(ProjectNoteRow)
        .where(ProjectNoteRow.project_id == project_id)
        .order_by(ProjectNoteRow.created_at.desc())
    )
    return list(session.scalars(stmt))


def get_note(session: Session, project_id: str, note_id: str) -> ProjectNoteRow | None:
    note = session.get(ProjectNoteRow, note_id)
    return note if note is not None and note.project_id == project_id else None


def delete_note(session: Session, note: ProjectNoteRow) -> None:
    session.delete(note)
    session.commit()
