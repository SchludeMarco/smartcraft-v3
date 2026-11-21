import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const photo = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "installation.jpg");

test("Projekt → Foto → Analyse → Prüfschritt dokumentieren → Bericht", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Testmodus");

  // Projekt anlegen
  await page.getByRole("button", { name: "Neues Projekt" }).click();
  await page.getByLabel("Projektname *").fill("E2E Unterverteilung Keller");
  await page.getByLabel("Adresse").fill("Teststraße 1");
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(page.getByRole("heading", { name: "E2E Unterverteilung Keller" })).toBeVisible();

  // Analyse per Foto
  await page.getByRole("link", { name: "Neue Analyse per Foto" }).click();
  await page.getByRole("button", { name: "Elektriker" }).click();
  await page.getByTestId("gallery-input").setInputFiles(photo);
  await expect(page.getByAltText("Foto 1")).toBeVisible();
  await page.getByLabel("Problembeschreibung (optional)").fill("[mock:unterverteilung]");
  await page.getByRole("button", { name: "Problem analysieren" }).click();

  // Ergebnis: Sicherheitsblock zuerst, Markierungen im Foto
  const safety = page.getByRole("region", { name: "Sicherheit" });
  await expect(safety).toContainText("TESTDATEN");
  await expect(safety).toContainText("Risiko hoch");
  await expect(safety).toContainText("Prüfung durch Fachkraft erforderlich");
  await expect(page.getByRole("button", { name: /^Bauteil \d/ })).toHaveCount(3);
  await page.getByRole("button", { name: /Bauteil 1: FI-Schutzschalter/ }).click();
  await expect(page.getByText("„40A 30mA Typ A“ – wahrscheinlich").first()).toBeVisible();

  // Fachkraft-Schritt: ohne Bestätigung abgelehnt, mit Bestätigung dokumentiert
  const check = page.getByTestId("check-0");
  await check.getByRole("button", { name: "Erledigt" }).click();
  await check.getByLabel("Dein Name *").fill("Max Elektro");
  await check.getByRole("button", { name: "Speichern" }).click();
  await expect(check.getByRole("alert")).toContainText("Fachkraft");
  await check.getByRole("checkbox").check();
  await check.getByRole("button", { name: "Speichern" }).click();
  await expect(check.getByText("Ausführung durch Fachkraft bestätigt")).toBeVisible();
  await expect(safety).toContainText("Risiko hoch"); // Abhaken ändert die Einschätzung nicht

  // Notiz und Bericht
  await page.getByRole("link", { name: "← Zum Projekt" }).click();
  await page.getByLabel("Neue Notiz").fill("Kunde informiert");
  await page.getByRole("button", { name: "Notiz speichern" }).click();
  await expect(page.getByText("Kunde informiert")).toBeVisible();
  await page.getByRole("link", { name: "Projektbericht ansehen / drucken" }).click();
  await expect(page.getByRole("note")).toContainText("keine Sicherheitsfreigabe");
  const summary = page.getByRole("region", { name: "Zusammenfassung" });
  await expect(summary).toContainText("1 erledigt");
  await expect(summary).toContainText("TESTDATEN");
});

test("Hochgeladenes Foto wird ohne Standortdaten ausgeliefert", async ({ page, request }) => {
  await page.goto("/");
  const project = await request.post("http://localhost:8000/projects", { data: { name: "GPS-Test" } });
  const { id } = await project.json();
  await page.goto(`/projects/${id}/analyses/new`);
  await page.getByRole("button", { name: "Maler" }).click();
  await page.getByTestId("gallery-input").setInputFiles(photo);
  await expect(page.getByAltText("Foto 1")).toBeVisible();
  await page.getByRole("button", { name: "Problem analysieren" }).click();
  await expect(page.getByRole("region", { name: "Sicherheit" })).toBeVisible();

  const image = page.locator("figure img").first();
  const src = await image.getAttribute("src");
  const bytes = await (await request.get(new URL(src ?? "", page.url()).toString())).body();
  expect(bytes.includes(Buffer.from("GPS"))).toBe(false);
  expect(bytes.includes(Buffer.from("SmartCraftTestCam"))).toBe(false);
});
