import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TREE, mockOwner, mockTree } from "./mock";

/* Audit automatique WCAG 2.2 AA (axe-core) sur chaque écran principal. */
const audit = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const lines = r.violations.map(
    (v) =>
      `${v.id} (${v.impact}) : ${v.help} [${v.nodes[0]?.failureSummary?.replace(/s+/g, " ")}] -> ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`,
  );
  expect(lines, lines.join("\n")).toEqual([]);
};

test("accueil", async ({ page }) => {
  await page.goto("/");
  await audit(page);
});

test("pages légales", async ({ page }) => {
  await page.goto("/confidentialite");
  await audit(page);
  await page.goto("/mentions-legales");
  await audit(page);
});

test("arbre partagé et fiche ouverte", async ({ page }) => {
  await mockTree(page, "prairie");
  await page.goto(`/partage/${TREE}`);
  await expect(page.getByRole("button", { name: /^Lucas Martin, Vous/ })).toBeVisible();
  await audit(page);
  await page.getByRole("button", { name: /^Claire Martin/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `test-results/fiche-${test.info().project.name}.png` });
  await audit(page);
});

test("fenêtres du propriétaire", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "mêmes fenêtres sur mobile");
  await mockTree(page, "nuit");
  await mockOwner(page);
  await page.goto(`/partage/${TREE}`);
  await page.getByRole("button", { name: "Partager" }).click();
  await expect(page.getByText("Steven (vous)")).toBeVisible();
  await audit(page);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page.getByRole("button", { name: "Image ou PDF" }).click();
  await audit(page);
});
