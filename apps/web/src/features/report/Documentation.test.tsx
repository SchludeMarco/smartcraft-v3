import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisDetail, AnalysisOverlay, CheckItem, Note, ProjectReport } from "../../api/types";
import { App } from "../../app/App";
import detailFixture from "../../test/fixtures/analysis-unterverteilung.json";
import overlayFixture from "../../test/fixtures/overlay-unterverteilung.json";
import reportFixture from "../../test/fixtures/report.json";
import { mockApi, path, renderWithProviders } from "../../test/utils";

const baseDetail = detailFixture as unknown as AnalysisDetail;
// Im Elektro-Szenario verlangt jeder Schritt eine Fachkraft – für den Test ein einfacher dazu
const simpleCheck: CheckItem = {
  ...(baseDetail.checks[0] as CheckItem),
  id: "simple",
  position: baseDetail.checks.length,
  action: "Stromkreise am Verteiler beschriften",
  requires_qualified_person: false,
  source: "model",
  component_indices: [],
};
const detail: AnalysisDetail = { ...baseDetail, checks: [...baseDetail.checks, simpleCheck] };
const overlay = overlayFixture as unknown as AnalysisOverlay;
const report = reportFixture as unknown as ProjectReport;
const health = {
  status: "ok",
  version: "0.10.0",
  environment: "test",
  ai_provider: "mock",
  persistent_storage: true,
};

const qualified = detail.checks.find((c) => c.requires_qualified_person) as CheckItem;
const simple = simpleCheck;

function analysisApi(patchReply: (body: Record<string, unknown>) => { status?: number; body: unknown }) {
  return mockApi((req) => {
    const p = path(req);
    if (p === "/health") return { body: health };
    if (p === `/analyses/${detail.id}`) return { body: detail };
    if (p === `/analyses/${detail.id}/overlay`) return { body: overlay };
    if (p.startsWith(`/analyses/${detail.id}/checks/`) && req.method === "PATCH") {
      // Body synchron nicht lesbar – Antwort hängt nur vom Testfall ab
      return patchReply({});
    }
    return undefined;
  });
}

describe("Prüfschritte dokumentieren", () => {
  it("verlangt bei Fachkraft-Schritten die Bestätigung und zeigt die Dokumentation", async () => {
    const documented: CheckItem = {
      ...qualified,
      status: "done",
      completed_by: "Max Elektro",
      completed_at: "2026-11-21T13:00:00Z",
      comment: "Messprotokoll liegt vor",
      qualified_person_confirmed: true,
    };
    const { calls } = analysisApi(() => ({ body: documented }));
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const card = within(await screen.findByTestId(`check-${qualified.position}`));
    await user.click(card.getByRole("button", { name: "Erledigt" }));
    await user.type(card.getByLabelText("Dein Name *"), "Max Elektro");
    await user.type(card.getByLabelText("Kommentar (optional)"), "Messprotokoll liegt vor");
    await user.click(card.getByRole("checkbox"));
    await user.click(card.getByRole("button", { name: "Speichern" }));

    expect(await card.findByText("erledigt")).toBeInTheDocument();
    expect(card.getByText("Ausführung durch Fachkraft bestätigt")).toBeInTheDocument();
    expect(card.getByText(/Max Elektro/)).toBeInTheDocument();
    const patch = calls.find((c) => c.method === "PATCH");
    expect(await patch?.json()).toEqual({
      status: "done",
      completed_by: "Max Elektro",
      comment: "Messprotokoll liegt vor",
      qualified_person_confirmed: true,
    });
  });

  it("zeigt die Ablehnung des Servers, wenn die Fachkraft-Bestätigung fehlt", async () => {
    analysisApi(() => ({
      status: 422,
      body: { detail: "Dieser Prüfschritt darf nur von einer Fachkraft ausgeführt werden." },
    }));
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const card = within(await screen.findByTestId(`check-${qualified.position}`));
    await user.click(card.getByRole("button", { name: "Erledigt" }));
    await user.type(card.getByLabelText("Dein Name *"), "Max");
    await user.click(card.getByRole("button", { name: "Speichern" }));

    expect(await card.findByRole("alert")).toHaveTextContent("nur von einer Fachkraft");
    expect(card.getByText("offen")).toBeInTheDocument();
  });

  it("fragt bei „nicht zutreffend“ nach einer Begründung und ohne Fachkraft-Häkchen", async () => {
    const { calls } = analysisApi(() => ({
      body: { ...simple, status: "not_applicable", completed_by: "Tim", comment: "schon erledigt" },
    }));
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const card = within(await screen.findByTestId(`check-${simple.position}`));
    await user.click(card.getByRole("button", { name: "Nicht zutreffend" }));
    expect(card.queryByRole("checkbox")).not.toBeInTheDocument();
    await user.type(card.getByLabelText("Dein Name *"), "Tim");
    await user.type(card.getByLabelText("Begründung *"), "schon erledigt");
    await user.click(card.getByRole("button", { name: "Speichern" }));

    expect(await card.findByText("nicht zutreffend")).toBeInTheDocument();
    const body = await calls.find((c) => c.method === "PATCH")?.json();
    expect(body).toMatchObject({ status: "not_applicable", qualified_person_confirmed: null });
  });

  it("weist darauf hin, dass Abhaken keine Freigabe ist", async () => {
    analysisApi(() => ({ body: {} }));
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    expect(await screen.findByText(/ist keine Freigabe/)).toBeInTheDocument();
  });
});

describe("Notizen", () => {
  it("legt Notizen an und löscht sie", async () => {
    let notes: Note[] = [{ id: "n1", text: "Kunde informiert", author: "Marco", created_at: "2026-11-21T12:30:00Z" }];
    const { calls } = mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects/p1") return { body: report.project };
      if (p === "/projects/p1/analyses") return { body: [] };
      if (p === "/projects/p1/notes" && req.method === "GET") return { body: notes };
      if (p === "/projects/p1/notes" && req.method === "POST") {
        notes = [{ id: "n2", text: "Material bestellt", author: null, created_at: "2026-11-21T13:00:00Z" }, ...notes];
        return { status: 201, body: notes[0] };
      }
      if (p === "/projects/p1/notes/n1" && req.method === "DELETE") {
        notes = notes.filter((n) => n.id !== "n1");
        return { status: 204, body: null };
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects/p1" });

    expect(await screen.findByText("Kunde informiert")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Neue Notiz"), "Material bestellt");
    await user.click(screen.getByRole("button", { name: "Notiz speichern" }));
    expect(await screen.findByText("Material bestellt")).toBeInTheDocument();
    expect(await calls.find((c) => c.method === "POST")?.json()).toMatchObject({ text: "Material bestellt" });

    const oldNote = screen.getByText("Kunde informiert").closest("li") as HTMLElement;
    await user.click(within(oldNote).getByRole("button", { name: /löschen/ }));
    await waitFor(() => expect(screen.queryByText("Kunde informiert")).not.toBeInTheDocument());
  });
});

describe("Projektbericht", () => {
  function reportApi() {
    return mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects/p1/report") return { body: report };
      return undefined;
    });
  }

  it("beginnt mit Haftungshinweis und Zusammenfassung inkl. offener Fachkraft-Schritte", async () => {
    reportApi();
    renderWithProviders(<App />, { route: "/projects/p1/report" });

    expect(await screen.findByRole("heading", { name: "EFH Müller", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("keine Sicherheitsfreigabe");
    const summary = within(screen.getByRole("region", { name: "Zusammenfassung" }));
    expect(summary.getByText(/TESTDATEN/)).toBeInTheDocument();
    expect(summary.getByText("Risiko hoch")).toBeInTheDocument();
    expect(summary.getByText(/2 offene Prüfschritte, die nur eine Fachkraft/)).toBeInTheDocument();
  });

  it("zeigt je Analyse Sicherheitsblock und Dokumentation der Prüfschritte", async () => {
    reportApi();
    renderWithProviders(<App />, { route: "/projects/p1/report" });

    expect(await screen.findAllByRole("region", { name: "Sicherheit" })).toHaveLength(report.analyses.length);
    expect(screen.getByText(/Max Elektro, 21\.11\.2026/)).toBeInTheDocument();
    expect(screen.getByText(/Fachkraft bestätigt/)).toBeInTheDocument();
    expect(screen.getByText(/Kunde informiert/)).toBeInTheDocument();
  });

  it("öffnet den Druckdialog", async () => {
    reportApi();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects/p1/report" });

    await user.click(await screen.findByRole("button", { name: "Drucken / als PDF speichern" }));

    expect(print).toHaveBeenCalled();
  });
});
