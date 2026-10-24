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

test("les pages légales s'ouvrent depuis l'accueil", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Confidentialité" }).click();
  await expect(page.getByRole("heading", { name: "Confidentialité", level: 1 })).toBeVisible();
  await expect(page.getByText("Aucun cookie publicitaire")).toBeVisible();
  await page.screenshot({ path: `test-results/confidentialite-${info.project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: "Mentions légales" }).click();
  await expect(page.getByText("939 387 510 00018")).toBeVisible();
  await expect(page).toHaveTitle("Mentions légales, Mon Arbre Généalogique");
});

test("mot de passe oublié : message neutre, puis page du nouveau mot de passe", async ({ page }) => {
  let asked = "";
  await page.route("**/auth/v1/recover**", (route) => {
    asked = route.request().postDataJSON()?.email ?? "";
    return route.fulfill({ json: {} });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Se connecter" }).click();
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByText("Saisissez d'abord votre adresse email")).toBeVisible();
  await page.getByLabel("Email").fill("jeanne@example.com");
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByText("Si un compte existe avec cette adresse")).toBeVisible();
  expect(asked).toBe("jeanne@example.com");
  await page.goto("/nouveau-mot-de-passe");
  await expect(page.getByText("Ce lien a expiré ou a déjà servi")).toBeVisible();
});
