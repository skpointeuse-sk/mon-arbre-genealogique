import { expect, test } from "@playwright/test";
import { TREE, mockOwner, mockTree } from "./mock";

test("le propriétaire change de décor : paysage animé, puis photo", async ({ page }, info) => {
  await mockTree(page, "prairie");
  await mockOwner(page);
  await page.goto(`/partage/${TREE}`);
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Décor" }).click();
  await page.getByRole("button", { name: "Lavande en Provence" }).click();
  await expect(page.getByRole("button", { name: "Lavande en Provence" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".scene-photo img")).toHaveAttribute("src", /lavande-1920\.webp/);
  await page.screenshot({ path: `test-results/decor-dialog-${info.project.name}.png` });
  await page.getByRole("button", { name: "Terminé" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/decor-lavande-${info.project.name}.png` });
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Décor" }).click();
  await page.getByRole("button", { name: "Nuit étoilée" }).click();
  await expect(page.locator(".scene-photo")).toHaveCount(0);
});

test("l'accueil propose d'essayer une photo en fond", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Voie lactée" }).check({ force: true });
  await expect(page.locator(".scene-photo img")).toHaveAttribute("src", /voie-lactee/);
  await page.screenshot({ path: "test-results/accueil-voie-lactee.png" });
});
