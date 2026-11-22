import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { AnalysisSummary, Project } from "../api/types";
import { mockApi, path, renderWithProviders } from "../test/utils";
import { App } from "./App";

const project: Project = {
  id: "p1",
  name: "EFH Müller",
  address: "Hauptstraße 5",
  client: "Familie Müller",
  description: null,
  created_at: "2026-11-21T10:00:00Z",
  updated_at: "2026-11-21T12:00:00Z",
  analysis_count: 1,
};

const analysis: AnalysisSummary = {
  id: "a1",
  project_id: "p1",
  created_at: "2026-11-21T12:00:00Z",
  trade: "elektriker",
  risk_level: "high",
  qualified_person_required: true,
  is_test_data: true,
  capture_count: 1,
  open_check_count: 3,
  title: "Unterverteilung ohne Blindabdeckung",
};

const health = {
  status: "ok",
  version: "0.8.0",
  environment: "test",
  ai_provider: "mock",
  persistent_storage: true,
};

describe("Projektübersicht", () => {
  it("führt per Tipp auf den Schriftzug zurück zur Projektübersicht", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [project] };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/aenderungen" });

    expect(await screen.findByText("AR-vorbereitet")).toBeInTheDocument();
    await user.click(await screen.findByText("Craft"));
    expect(await screen.findByText("EFH Müller")).toBeInTheDocument();
  });

  it("öffnet das Änderungsprotokoll über die Fußzeile", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [project] };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/" });

    await user.click(await screen.findByRole("link", { name: /Änderungsprotokoll · Version/ }));
    expect(
      await screen.findByRole("heading", { name: "Änderungsprotokoll" }),
    ).toBeInTheDocument();
  });

  it("zeigt Projekte und den Testmodus-Hinweis", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [project] };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects" });

    expect(await screen.findByText("EFH Müller")).toBeInTheDocument();
    expect(screen.getByText("Hauptstraße 5")).toBeInTheDocument();
    expect(screen.getByText("1 Analyse")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(/Testmodus/);
    expect(screen.getByRole("status")).not.toHaveTextContent(/Demo/);
  });

  it("weist im Demo-Betrieb dezent in der Fußzeile auf flüchtigen Speicher hin", async () => {
    mockApi((req) => {
      if (path(req) === "/health")
        return { body: { ...health, ai_provider: "gemini", persistent_storage: false } };
      if (path(req) === "/projects") return { body: [] };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects" });

    expect(await screen.findByText(/Demo-Speicher/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("zeigt keinen Testmodus-Hinweis bei echtem Provider", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: { ...health, ai_provider: "gemini" } };
      if (path(req) === "/projects") return { body: [] };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects" });

    expect(await screen.findByText(/Noch keine Projekte/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("zeigt eine verständliche Meldung, wenn der Server nicht antwortet", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { status: 500, body: {} };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects" });

    expect(await screen.findByRole("alert")).toHaveTextContent(/Server/);
  });
});

describe("Start in der Projektübersicht", () => {
  it("zeigt beim App-Start die Projekte zur Auswahl", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [project] };
      return undefined;
    });
    renderWithProviders(<App />);
    expect(await screen.findByText("Projekt auswählen")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /EFH Müller/ })).toHaveAttribute("href", "/projects/p1");
    expect(screen.getByRole("link", { name: "Schnellanalyse ohne Projekt" })).toHaveAttribute("href", "/analyse");
    expect(screen.queryByLabelText("Projektname *")).not.toBeInTheDocument();
    // Haftungshinweis nur bei Analysen, nicht vor der Projektauswahl
    expect(screen.queryByText(/HAFTUNGSAUSSCHLUSS/)).not.toBeInTheDocument();
  });

  it("öffnet ohne Projekte direkt das Formular für das erste Projekt", async () => {
    mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [] };
      return undefined;
    });
    renderWithProviders(<App />);
    expect(await screen.findByText(/leg dein erstes Projekt an/)).toBeInTheDocument();
    expect(screen.getByLabelText("Projektname *")).toBeInTheDocument();
  });
});

describe("Projekt anlegen", () => {
  it("legt ein Projekt an und öffnet es", async () => {
    const created: Project = { ...project, id: "neu", name: "Neubau Schmidt", analysis_count: 0 };
    const { calls } = mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects" && req.method === "GET") return { body: [] };
      if (p === "/projects" && req.method === "POST") return { status: 201, body: created };
      if (p === "/projects/neu") return { body: created };
      if (p === "/projects/neu/analyses") return { body: [] };
      if (p === "/projects/neu/notes") return { body: [] };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects" });

    await user.click(await screen.findByRole("button", { name: "Neues Projekt" }));
    await user.type(screen.getByLabelText("Projektname *"), "  Neubau Schmidt ");
    await user.type(screen.getByLabelText("Adresse"), "Gartenweg 2");
    await user.click(screen.getByRole("button", { name: "Projekt anlegen" }));

    expect(await screen.findByRole("heading", { name: "Neubau Schmidt" })).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(await post?.json()).toEqual({
      name: "Neubau Schmidt",
      address: "Gartenweg 2",
      client: null,
      description: null,
    });
  });

  it("verlangt einen Namen, ohne den Server zu fragen", async () => {
    const { calls } = mockApi((req) => {
      if (path(req) === "/health") return { body: health };
      if (path(req) === "/projects") return { body: [] };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects" });

    await user.click(await screen.findByRole("button", { name: "Neues Projekt" }));
    await user.type(screen.getByLabelText("Projektname *"), "   ");
    await user.click(screen.getByRole("button", { name: "Projekt anlegen" }));

    expect(screen.getByText("Bitte einen Projektnamen eingeben.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("zeigt Fehlermeldungen des Servers an", async () => {
    mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects" && req.method === "GET") return { body: [] };
      if (p === "/projects" && req.method === "POST")
        return { status: 422, body: { detail: [{ msg: "Name zu lang" }] } };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects" });

    await user.click(await screen.findByRole("button", { name: "Neues Projekt" }));
    await user.type(screen.getByLabelText("Projektname *"), "X");
    await user.click(screen.getByRole("button", { name: "Projekt anlegen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Name zu lang");
  });
});

describe("Rate-Limit", () => {
  it("zeigt die Wartezeit des Servers bei zu vielen Anfragen", async () => {
    mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects" && req.method === "GET") return { body: [] };
      if (p === "/projects" && req.method === "POST")
        return {
          status: 429,
          body: { detail: "Zu viele Anfragen. Bitte in 42 Sekunden erneut versuchen.", code: "rate_limited" },
        };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/projects" });

    await user.click(await screen.findByRole("button", { name: "Neues Projekt" }));
    await user.type(screen.getByLabelText("Projektname *"), "X");
    await user.click(screen.getByRole("button", { name: "Projekt anlegen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("in 42 Sekunden");
  });
});

describe("Projektseite", () => {
  it("zeigt Analysen mit Risiko, Fachkraft-Pflicht und Testdaten-Kennzeichnung", async () => {
    mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/projects/p1") return { body: project };
      if (p === "/projects/p1/analyses") return { body: [analysis] };
      if (p === "/projects/p1/notes") return { body: [] };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects/p1" });

    expect(await screen.findByRole("heading", { name: "EFH Müller" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Risiko hoch")).toBeInTheDocument());
    expect(screen.getByText("Fachkraft erforderlich")).toBeInTheDocument();
    expect(screen.getByText("Testdaten")).toBeInTheDocument();
    expect(screen.getByText(/3 offene/)).toBeInTheDocument();
  });

  it("meldet ein unbekanntes Projekt", async () => {
    mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p.startsWith("/projects/x"))
        return { status: 404, body: { detail: "Projekt nicht gefunden" } };
      return undefined;
    });

    renderWithProviders(<App />, { route: "/projects/x" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Projekt nicht gefunden");
  });
});
