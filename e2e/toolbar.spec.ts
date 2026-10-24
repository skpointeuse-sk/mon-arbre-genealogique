import { expect, test } from "@playwright/test";
import { TREE, mockOwner, mockTree } from "./mock";

test.skip(({ isMobile }) => isMobile, "sur téléphone, les outils passent dans le menu");

for (const width of [1440, 1280, 1180, 1000, 901]) {
  test(`la barre d'outils du propriétaire tient à ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockTree(page, "prairie");
    await mockOwner(page);
    await page.goto(`/partage/${TREE}`);
    await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();
    const right = await page.locator(".topbar-tools > :last-child").evaluate((el) => el.getBoundingClientRect().right);
    await page.screenshot({ path: `test-results/barre-${width}.png`, clip: { x: 0, y: 0, width, height: 70 } });
    expect(right).toBeLessThanOrEqual(width);
  });
}

test("le menu Fichier regroupe les exports et l'import", async ({ page }) => {
  await mockTree(page, "prairie");
  await mockOwner(page);
  await page.goto(`/partage/${TREE}`);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Image PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Importer un GEDCOM" })).toBeVisible();
  await page.screenshot({ path: "test-results/barre-menu-fichier.png", clip: { x: 640, y: 0, width: 800, height: 240 } });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Image PNG" })).toBeHidden();
});
