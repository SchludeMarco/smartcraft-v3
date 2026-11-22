import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnalysisDetail } from "../../api/types";
import { App } from "../../app/App";
import { listQueued } from "../../lib/offlineQueue";
import detailFixture from "../../test/fixtures/analysis-unterverteilung.json";
import { mockApi, path, renderWithProviders } from "../../test/utils";

const detail = detailFixture as unknown as AnalysisDetail;
const health = { status: "ok", version: "x", environment: "test", ai_provider: "mock", persistent_storage: true };

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? "online" : "offline"));
  });
}

function api() {
  return mockApi((req) => {
    const p = path(req);
    if (p === "/health") return { body: health };
    if (p === "/meta/trades") return { body: [{ id: "elektriker", label: "Elektriker" }] };
    if (p === "/tools") return { body: [] };
    if (p === "/projects") return { body: [] };
    if (p === "/analyses" && req.method === "POST") return { status: 201, body: detail };
    if (p === "/analyses") return { body: [] };
    return undefined;
  });
}

afterEach(() => setOnline(true));

describe("Offline wie V2", () => {
  it("speichert ohne Empfang für später und holt die Analyse automatisch nach", async () => {
    const { calls } = api();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });
    setOnline(false);

    expect(await screen.findByText("Kein Empfang")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Problembeschreibung"), "Steckdose ohne Strom");
    await user.click(screen.getByRole("button", { name: "Für später speichern (offline)" }));

    expect(await screen.findByText(/wird automatisch durchgeführt, sobald wieder/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /1 Analyse wartet auf Verbindung/ })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    expect(await listQueued()).toHaveLength(1);

    setOnline(true);
    expect(await screen.findByText(/Offline-Analyse wurde durchgeführt/)).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST") as Request;
    expect((await post.formData()).get("note")).toBe("Steckdose ohne Strom");
    await waitFor(async () => expect(await listQueued()).toHaveLength(0));
  });

  it("zeigt die Offline-Kurzhilfe des gewählten Berufs", async () => {
    api();
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });
    await user.click(await screen.findByRole("button", { name: "Elektriker" }));
    setOnline(false);
    await user.click(await screen.findByRole("button", { name: "Sofort-Checkliste ohne Internet ansehen" }));
    const dialog = screen.getByRole("dialog", { name: "Offline-Kurzhilfe" });
    expect(within(dialog).getByText("FI-Schutzschalter löst aus")).toBeInTheDocument();
    expect(within(dialog).getByText(/nur durch eine Elektrofachkraft/)).toBeInTheDocument();
  });
});

describe("Diagnose vorlesen", () => {
  it("liest mit der Browser-Stimme vor – Sicherheit zuerst", async () => {
    api();
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn(), getVoices: () => [] });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        lang = "";
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/analyse" });
    await user.type(await screen.findByLabelText("Problembeschreibung"), "FI");
    await user.click(screen.getByRole("button", { name: "Problem analysieren" }));
    await user.click(await screen.findByRole("button", { name: "Diagnose vorlesen" }));

    const text = (speak.mock.calls[0]?.[0] as { text: string }).text;
    expect(text.startsWith("Achtung, Testdaten.")).toBe(true);
    expect(text).toContain("Risiko hoch.");
    expect(text).toContain("Fachkraft erforderlich");
    expect(text.indexOf("Risiko")).toBeLessThan(text.indexOf("Diagnose"));
    expect(screen.getByRole("button", { name: "Vorlesen stoppen" })).toBeInTheDocument();
  });
});
