import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisDetail, AnalysisOverlay } from "../../api/types";
import { App } from "../../app/App";
import detailFixture from "../../test/fixtures/analysis-unterverteilung.json";
import unusableFixture from "../../test/fixtures/analysis-unbrauchbares_foto.json";
import overlayFixture from "../../test/fixtures/overlay-unterverteilung.json";
import unusableOverlayFixture from "../../test/fixtures/overlay-unbrauchbares_foto.json";
import { mockApi, path, renderWithProviders } from "../../test/utils";

// Echte Backend-Antworten (Mock-KI), erzeugt mit apps/api/scripts/export_web_fixtures.py
const detail = detailFixture as unknown as AnalysisDetail;
const overlay = overlayFixture as unknown as AnalysisOverlay;
const unusable = unusableFixture as unknown as AnalysisDetail;
const unusableOverlay = unusableOverlayFixture as unknown as AnalysisOverlay;

vi.mock("../../lib/resizeImage", () => ({
  MAX_UPLOAD_BYTES: 4 * 1024 * 1024,
  resizeImage: vi.fn(async (file: Blob) => new Blob([await file.arrayBuffer()], { type: "image/jpeg" })),
}));

const health = {
  status: "ok",
  version: "0.9.0",
  environment: "test",
  ai_provider: "mock",
  persistent_storage: true,
};
const project = {
  id: "p1",
  name: "EFH Müller",
  address: null,
  client: null,
  description: null,
  created_at: "2026-11-21T10:00:00Z",
  updated_at: "2026-11-21T12:00:00Z",
  analysis_count: 0,
};
const trades = [
  { id: "elektriker", label: "Elektriker" },
  { id: "klempner", label: "Klempner (Sanitär/Heizung)" },
];

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:vorschau");
  URL.revokeObjectURL = vi.fn();
});

function photo(name = "foto.jpg") {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], name, { type: "image/jpeg" });
}

const tools = [
  { id: "materialliste", label: "Materialliste", trade: null, kind: "materials", requires_analysis: true },
  { id: "kundenbericht", label: "Kundenbericht", trade: null, kind: "text", requires_analysis: true },
  { id: "elektriker-vde", label: "VDE-Vorschriften-Check", trade: "elektriker", kind: "text", requires_analysis: false },
  { id: "klempner-normteile", label: "Normteile-Finder", trade: "klempner", kind: "text", requires_analysis: false },
];

function toolReply(toolId: string, trade: string, extra: Record<string, unknown> = {}) {
  return {
    tool_id: toolId,
    label: tools.find((t) => t.id === toolId)?.label ?? toolId,
    trade,
    analysis_id: null,
    basis: "trade",
    text: "**Wichtig:** Messung nach DIN VDE 0100-600\n- Isolationswiderstand\n<script>alert(1)</script>",
    materials: null,
    safety: {
      hazards: ["electrical"],
      qualified_person_required: true,
      notices: ["Elektrische Anlage: Arbeiten nur durch Elektrofachkraft."],
      disclaimer: "KI-gestützter Vorschlag ohne Gewähr.",
    },
    source: { provider_id: "mock", model_id: "m", is_test_data: true },
    policy: { version: "1.4.0", interventions: [] },
    prompt_version: "1.0.0",
    ...extra,
  };
}

function standardApi(uploadReply?: { status?: number; body: unknown }) {
  return mockApi((req) => {
    const p = path(req);
    if (p === "/health") return { body: health };
    if (p === "/tools") return { body: tools };
    if (p === "/analyses" && req.method === "GET")
      return { body: [{ id: detail.id, project_id: null, created_at: detail.created_at, trade: "elektriker", risk_level: "high", qualified_person_required: true, is_test_data: true, capture_count: 1, open_check_count: 3, title: "Unterverteilung ohne Blindabdeckung", note: null }] };
    if (p.startsWith(`/analyses/${detail.id}/captures/`)) return { body: "bild" };
    if (p === "/tools/elektriker-vde") return { body: toolReply("elektriker-vde", "elektriker") };
    if (p === "/tools/materialliste")
      return {
        body: toolReply("materialliste", "elektriker", {
          text: null,
          materials: [{ category: "Material", item: "Blindabdeckung 1 TE", quantity: "2 Stk" }],
        }),
      };
    if (p === "/meta/trades") return { body: trades };
    if (p === "/projects") return { body: [project] };
    if (p === "/projects/p1") return { body: project };
    if ((p === "/analyses" || p === "/projects/p1/analyses") && req.method === "POST")
      return uploadReply ?? { status: 201, body: detail };
    if (p === `/analyses/${detail.id}` && req.method === "PATCH")
      return { body: { ...detail, project_id: "p1" } };
    if (p === `/analyses/${detail.id}`) return { body: detail };
    if (p === `/analyses/${detail.id}/overlay`) return { body: overlay };
    if (p === `/analyses/${unusable.id}`) return { body: unusable };
    if (p === `/analyses/${unusable.id}/overlay`) return { body: unusableOverlay };
    return undefined;
  });
}

async function postedForm(calls: Request[]) {
  const post = calls.find((c) => c.method === "POST");
  if (!post) throw new Error("kein Upload");
  return { url: path(post), form: await post.formData() };
}

describe("Startseite im V2-Ablauf", () => {
  it("zeigt die drei V2-Schritte und Allround als Startberuf", async () => {
    standardApi();
    renderWithProviders(<App />, { route: "/analyse" });

    expect(await screen.findByText("1. Beruf auswählen")).toBeInTheDocument();
    expect(screen.getByText("2. Problem dokumentieren & analysieren")).toBeInTheDocument();
    expect(screen.getByText("3. Ergebnis der KI-Analyse")).toBeInTheDocument();
    expect(screen.getByText("Starten Sie Ihre Bauanalyse")).toBeInTheDocument();
    expect(screen.getByText(/HAFTUNGSAUSSCHLUSS/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Problem analysieren" })).toBeDisabled();
  });

  it("analysiert Fotos mit Beruf und Beschreibung und zeigt das Ergebnis darunter", async () => {
    const { calls } = standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.click(await screen.findByRole("button", { name: "Elektriker" }));
    expect(screen.getByText("Elektriker", { selector: "span.font-bold" })).toBeInTheDocument();
    await user.upload(screen.getByTestId("gallery-input"), [photo("a.jpg"), photo("b.jpg")]);
    expect(await screen.findByAltText("Foto 2")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Problembeschreibung"), "Keller");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));

    expect(await screen.findByRole("heading", { name: "Lösung und Diagnose" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sicherheit" })).toBeInTheDocument();
    expect(screen.getByText(detail.result.diagnosis as string)).toBeInTheDocument();
    const { url, form } = await postedForm(calls);
    expect(url).toBe("/analyses");
    expect(form.get("trade")).toBe("elektriker");
    expect(form.get("note")).toBe("Keller");
    expect(form.getAll("files")).toHaveLength(2);
  });

  it("analysiert wie in V2 auch nur mit Beschreibung", async () => {
    const { calls } = standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.type(await screen.findByLabelText("Problembeschreibung"), "Wasserhahn tropft");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));

    await screen.findByRole("heading", { name: "Lösung und Diagnose" });
    const { form } = await postedForm(calls);
    expect(form.get("trade")).toBe("allround");
    expect(form.getAll("files")).toHaveLength(0);
  });

  it("merkt sich den Beruf", async () => {
    standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });
    await user.click(await screen.findByRole("button", { name: "Klempner (Sanitär/Heizung)" }));
    expect(window.localStorage.getItem("smartcraft.trade")).toBe("klempner");
  });

  it("begrenzt auf fünf Fotos und lässt Fotos entfernen", async () => {
    standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    const input = await screen.findByTestId("gallery-input");
    await user.upload(input, [1, 2, 3, 4, 5, 6].map((i) => photo(`${i}.jpg`)));

    expect(await screen.findByAltText("Foto 5")).toBeInTheDocument();
    expect(screen.queryByAltText("Foto 6")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Höchstens 5 Fotos");
    expect(screen.getByTestId("gallery-input")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Foto 1 entfernen" }));
    expect(screen.getByText("4/5 Bilder ausgewählt")).toBeInTheDocument();
  });

  it("zeigt Analysefehler wie V2 und behält die Fotos", async () => {
    standardApi({ status: 413, body: {} });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.upload(await screen.findByTestId("gallery-input"), [photo()]);
    await screen.findByAltText("Foto 1");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Analysefehler");
    expect(alert).toHaveTextContent("zu groß");
    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
  });

  it("analysiert direkt für ein Projekt, wenn es aus der Projektseite kommt", async () => {
    const { calls } = standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse?projekt=p1" });

    expect(await screen.findByText("EFH Müller")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Problembeschreibung"), "Riss");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await screen.findByRole("heading", { name: "Lösung und Diagnose" });
    expect((await postedForm(calls)).url).toBe("/projects/p1/analyses");
  });

  it("ordnet ein Ergebnis nachträglich einem Projekt zu", async () => {
    let current: AnalysisDetail = { ...detail, project_id: null };
    const { calls } = mockApi((req) => {
      const p = path(req);
      if (p === "/health") return { body: health };
      if (p === "/meta/trades") return { body: trades };
      if (p === "/projects") return { body: [project] };
      if (p === "/analyses" && req.method === "POST") return { status: 201, body: current };
      if (p === `/analyses/${detail.id}` && req.method === "PATCH") {
        current = { ...current, project_id: "p1" };
        return { body: current };
      }
      if (p === `/analyses/${detail.id}`) return { body: current };
      if (p === `/analyses/${detail.id}/overlay`) return { body: overlay };
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.type(await screen.findByLabelText("Problembeschreibung"), "Riss");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await screen.findByRole("heading", { name: "Lösung und Diagnose" });

    await user.selectOptions(await screen.findByLabelText(/Einem Projekt zuordnen/), "p1");
    await user.click(screen.getByRole("button", { name: "Zuordnen" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH") as Request;
    expect(await patch.json()).toEqual({ project_id: "p1" });
    expect(await screen.findByRole("link", { name: "EFH Müller" })).toBeInTheDocument();
  });
});

describe("Ergebnisansicht", () => {
  it("zeigt den Sicherheitsblock vor allen anderen Inhalten", async () => {
    standardApi();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const safety = await screen.findByRole("region", { name: "Sicherheit" });
    expect(safety).toHaveTextContent("TESTDATEN");
    expect(safety).toHaveTextContent("Risiko hoch");
    expect(safety).toHaveTextContent("Prüfung durch Fachkraft erforderlich");
    expect(safety).toHaveTextContent("Elektrische Gefahr");
    expect(safety).toHaveTextContent(detail.result.safety.disclaimer);

    const photos = screen.getByRole("heading", { name: "Fotos" });
    expect(safety.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("markiert Bauteile im Foto und zeigt Details beim Antippen", async () => {
    standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const marker = await screen.findByRole("button", { name: /Bauteil 1: FI-Schutzschalter/ });
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^Bauteil \d/ })).toHaveLength(overlay.anchors.length),
    );
    expect(marker).toHaveStyle({ left: "12%", top: "25%", width: "10%" });

    await user.click(marker);
    expect(marker).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(/40A 30mA Typ A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nur Fachkraft/).length).toBeGreaterThan(0);
  });

  it("listet Prüfschritte mit Pflicht-Kennzeichnung, Fachkraft und Bauteilbezug", async () => {
    standardApi();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    const heading = await screen.findByRole("heading", { name: "Nächste Prüfschritte" });
    const list = within(heading.parentElement as HTMLElement);
    expect(list.getAllByText("Pflicht (Sicherheitsprüfung)").length).toBe(
      detail.checks.filter((c) => c.source === "policy").length,
    );
    expect(list.getByText("DIN VDE 0100-600")).toBeInTheDocument();
    expect(list.getAllByText(/An: 1\. FI-Schutzschalter/).length).toBeGreaterThan(0);
  });

  it("kennzeichnet unsicher gelesene Beschriftungen", async () => {
    standardApi();
    renderWithProviders(<App />, { route: `/analyses/${detail.id}` });

    expect(await screen.findByText("„B1?“ – unsicher")).toBeInTheDocument();
  });

  it("weist auf unbrauchbare Fotos hin und zeigt keine Markierungen", async () => {
    standardApi();
    renderWithProviders(<App />, { route: `/analyses/${unusable.id}` });

    expect(await screen.findByText(/Bildqualität reicht nicht aus/)).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^Bauteil \d/ })).toHaveLength(0);
    expect(screen.getByText(/Neues Foto aufnehmen/)).toBeInTheDocument();
  });
});

describe("KI-Werkzeuge wie V2", () => {
  it("bietet Berufs-Spezial-Tools sofort nach der Berufswahl an", async () => {
    const { calls } = standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.click(await screen.findByRole("button", { name: "Elektriker" }));
    expect(await screen.findByText("Elektriker-Spezial-Tools")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Normteile-Finder/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Problembeschreibung"), "Herd anschließen");
    await user.click(screen.getByRole("button", { name: /VDE-Vorschriften-Check/ }));

    const card = await screen.findByRole("region", { name: "VDE-Vorschriften-Check" });
    expect(card).toHaveTextContent("Ausführung nur durch eine qualifizierte Fachkraft");
    expect(within(card).getByText("Wichtig:").tagName).toBe("STRONG");
    expect(card.querySelector("script")).toBeNull();
    const post = calls.find((c) => path(c) === "/tools/elektriker-vde") as Request;
    expect(await post.json()).toEqual({ trade: "elektriker", analysis_id: null, note: "Herd anschließen" });

    await user.click(within(card).getByRole("button", { name: "VDE-Vorschriften-Check entfernen" }));
    expect(screen.queryByRole("region", { name: "VDE-Vorschriften-Check" })).not.toBeInTheDocument();
  });

  it("zeigt beim Allround-Handwerker alle Spezial-Tools", async () => {
    standardApi();
    renderWithProviders(<App />, { route: "/analyse" });
    expect(await screen.findByText("Alle Berufs-Spezial-Tools")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Normteile-Finder/ })).toBeInTheDocument();
  });

  it("erstellt nach der Analyse eine Materialliste auf Basis der Diagnose", async () => {
    const { calls } = standardApi();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });

    await user.type(await screen.findByLabelText("Problembeschreibung"), "FI fliegt");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await user.click(await screen.findByRole("button", { name: /Materialliste/ }));

    expect(await screen.findByText("Blindabdeckung 1 TE")).toBeInTheDocument();
    const post = calls.find((c) => path(c) === "/tools/materialliste") as Request;
    expect((await post.json()).analysis_id).toBe(detail.id);
  });

  it("lässt den Bildschirm wackeln, wenn die Analyse fertig ist", async () => {
    standardApi();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const user = userEvent.setup();
    const { container } = renderWithProviders(<App />, { route: "/analyse" });

    await user.type(await screen.findByLabelText("Problembeschreibung"), "Riss");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await screen.findByRole("heading", { name: "Lösung und Diagnose" });
    expect(container.querySelector("#app-shell")).toHaveClass("shake");
    expect(vibrate).toHaveBeenCalled();
  });
});

describe("PDF, Teilen, Lokal speichern, Verlauf (wie V2)", () => {
  async function analyzeOnce() {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });
    await user.type(await screen.findByLabelText("Problembeschreibung"), "FI fliegt");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await screen.findByRole("heading", { name: "Lösung und Diagnose" });
    return user;
  }

  it("exportiert den Bericht als druckbare Seite", async () => {
    standardApi();
    const written: string[] = [];
    const fakeWindow = {
      document: { open: vi.fn(), write: (h: string) => written.push(h), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      setTimeout: (fn: () => void) => fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    const user = await analyzeOnce();

    await user.click(screen.getByRole("button", { name: "Als PDF exportieren" }));
    await waitFor(() => expect(fakeWindow.print).toHaveBeenCalled());
    expect(written.join("")).toContain("<h2>Sicherheit</h2>");
    expect(written.join("")).toContain(detail.result.safety.disclaimer);
  });

  it("teilt den Bericht per WhatsApp-Link mit Sicherheitshinweis", async () => {
    standardApi();
    const user = await analyzeOnce();
    await user.click(screen.getByRole("button", { name: "Teilen" }));
    const dialog = await screen.findByRole("dialog", { name: "Analyse teilen" });
    const href = within(dialog).getByRole("link", { name: "WhatsApp" }).getAttribute("href") ?? "";
    expect(decodeURIComponent(href)).toContain("Risiko: hoch");
    expect(decodeURIComponent(href)).toContain("TESTDATEN");
  });

  it("speichert lokal und öffnet die Analyse aus dem Verlauf ohne Server", async () => {
    standardApi();
    const user = await analyzeOnce();
    await user.click(screen.getByRole("button", { name: "Lokal speichern" }));
    expect(await screen.findByText("Gespeichert!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verlauf" }));
    const dialog = await screen.findByRole("dialog", { name: "Verlauf" });
    expect(await within(dialog).findByText("Unterverteilung ohne Blindabdeckung")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("tab", { name: "Lokal" }));
    await user.click(await within(dialog).findByText(detail.result.diagnosis as string));

    expect(await screen.findByText("Lokal gespeicherte Analyse")).toBeInTheDocument();
    expect(screen.getByText(/Lokal auf diesem Gerät gespeichert/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sicherheit" })).toBeInTheDocument();
  });
});
