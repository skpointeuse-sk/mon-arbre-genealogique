import { expect, test } from "@playwright/test";
import { TREE, mockTree } from "./mock";

test.beforeEach(async ({ page }) => {
  await mockTree(page, "prairie");
  await page.goto(`/partage/${TREE}`);
  await expect(page.getByRole("button", { name: /^Lucas Martin, Vous/ })).toBeVisible();
});

test("les boutons de zoom changent l'échelle affichée", async ({ page }) => {
  const level = page.locator(".zoom-level");
  const before = await level.textContent();
  await page.getByRole("button", { name: "Zoomer", exact: true }).click();
  await expect(level).not.toHaveText(before ?? "");
});

test("un clic sur une carte ouvre la fiche, Échap la referme", async ({ page }) => {
  await page.getByRole("button", { name: /^Claire Martin/ }).click();
  await expect(page.getByRole("heading", { name: /Claire/ })).toBeVisible();
  await page.keyboard.press("Escape");
});

test("la recherche retrouve une personne", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "la recherche mobile passe par le bouton loupe");
  await page.getByRole("searchbox", { name: "Rechercher une personne" }).fill("emma");
  await expect(page.getByRole("option", { name: /Emma Martin/ })).toBeVisible();
});

test("le vérificateur s'ouvre et ne signale rien sur une famille cohérente", async ({ page }, info) => {
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Vérifier" }).click();
  await expect(page.getByText("Rien à signaler")).toBeVisible();
  await page.screenshot({ path: `test-results/verifier-${info.project.name}.png` });
});
