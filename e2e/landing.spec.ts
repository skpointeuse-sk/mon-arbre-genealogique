import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche sans erreur ni défilement horizontal", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /créer mon arbre/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/accueil-${info.project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("une adresse inconnue affiche un message clair", async ({ page }) => {
  await page.goto("/cette-page-nexiste-pas");
  await expect(page.getByText("Cette page n'existe pas.")).toBeVisible();
});

test("les pages réservées renvoient vers l'accueil sans connexion", async ({ page }) => {
  await page.goto("/arbre");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/creer");
  await expect(page).toHaveURL(/\/$/);
});

test("un ancien lien de partage est redirigé", async ({ page }) => {
  await page.goto("/?arbre=00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/partage\/00000000-0000-0000-0000-000000000000$/);
  await expect(page.getByText("Cet arbre est privé ou n'existe pas.")).toBeVisible();
});
