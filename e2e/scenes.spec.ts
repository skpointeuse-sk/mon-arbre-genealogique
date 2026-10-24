import { expect, test } from "@playwright/test";
import { TREE, mockTree } from "./mock";

const AMBIANCES = ["Prairie fleurie", "Forêt d'automne", "Montagnes à l'aube", "Coucher de soleil", "Nuit étoilée"];

test("chaque ambiance s'essaie depuis l'accueil", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  for (const [i, name] of AMBIANCES.entries()) {
    await page.getByText(name, { exact: true }).click();
    await expect(page.getByRole("radio", { name })).toBeChecked();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/ambiance-${i + 1}-${info.project.name}.png` });
  }
  // Le choix est retenu au rechargement.
  await page.reload();
  await expect(page.getByRole("radio", { name: "Nuit étoilée" })).toBeChecked();
  expect(errors).toEqual([]);
});

for (const [i, preset] of ["prairie", "foret", "aube", "mer", "nuit"].entries())
  test(`l'arbre partagé s'affiche dans l'ambiance ${preset}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await mockTree(page, preset);
    await page.goto(`/partage/${TREE}`);
    await expect(page.getByRole("button", { name: /^Lucas Martin, Vous/ })).toBeVisible();
    await expect(page.locator(".scene")).toBeVisible();
    await page.screenshot({ path: `test-results/arbre-${i + 1}-${preset}-${info.project.name}.png` });
    expect(errors).toEqual([]);
  });
