import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const photo = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "installation.jpg");

test("V2-Ablauf: Beruf → Foto → Analyse → Projekt → Prüfschritt → Bericht", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Testmodus");
  await expect(page.getByText("1. Beruf auswählen")).toBeVisible();

  // Projekt anlegen (über den Projekte-Knopf in der Kopfleiste)
  await page.getByRole("link", { name: "Projekte" }).click();
  await page.getByRole("button", { name: "Neues Projekt" }).click();
  await page.getByLabel("Projektname *").fill("E2E Unterverteilung Keller");
  await page.getByLabel("Adresse").fill("Teststraße 1");
  await page.getByRole("button", { name: "Projekt anlegen" }).click();
  await expect(page.getByRole("heading", { name: "E2E Unterverteilung Keller" })).toBeVisible();

  // Analyse per Foto auf der Startseite (V2-Ablauf), direkt für das Projekt
  await page.getByRole("link", { name: "Neue Analyse für dieses Projekt" }).click();
  await page.getByRole("button", { name: "Elektriker" }).click();
  await page.getByTestId("gallery-input").setInputFiles(photo);
  await expect(page.getByAltText("Foto 1")).toBeVisible();
  await page.getByLabel("Problembeschreibung").fill("[mock:unterverteilung]");
  await page.getByRole("button", { name: "Problem analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Lösung und Diagnose" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("nur durch eine qualifizierte Fachkraft");

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
  await page.getByRole("link", { name: "E2E Unterverteilung Keller" }).last().click();
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

test("Analyse nur mit Beschreibung, ohne Foto (wie V2)", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Problembeschreibung").fill("Silikonfuge in der Dusche schimmelt [mock:heizung]");
  await page.getByRole("button", { name: "Problem analysieren" }).click();
  await expect(page.getByRole("heading", { name: "Lösung und Diagnose" })).toBeVisible();
  await expect(page.getByText("Schrittweise Lösung")).toBeVisible();
  await expect(page.getByText(/Kein Foto: Die Einschätzung beruht nur auf der Beschreibung/)).toBeVisible();

  // KI-Werkzeuge wie V2: Kostenschätzung auf Basis der Diagnose, Spezial-Tool
  await page.getByRole("button", { name: /Kostenschätzung/ }).click();
  await expect(page.getByRole("region", { name: "Kostenschätzung" })).toContainText("TESTDATEN");
  await page.getByRole("button", { name: /Statik-Hinweise/ }).click();
  const statik = page.getByRole("region", { name: "Statik-Hinweise" });
  await expect(statik).toContainText("Ausführung nur durch eine qualifizierte Fachkraft");

  // Lokal speichern und über den Verlauf wieder öffnen
  await page.getByRole("button", { name: "Lokal speichern" }).click();
  await expect(page.getByText("Gespeichert!")).toBeVisible();
  await page.getByRole("button", { name: "Verlauf" }).click();
  await page.getByRole("tab", { name: "Lokal" }).click();
  await page.getByRole("dialog").getByRole("link").first().click();
  await expect(page.getByText("Lokal gespeicherte Analyse")).toBeVisible();
  await expect(page.getByRole("region", { name: "Kostenschätzung" })).toBeVisible();
});
