import { expect, test, type Page } from "@playwright/test";

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

/* Arbre fictif servi à la place de Supabase : on voit le canevas sans compte ni réseau. */
const TREE = "11111111-1111-1111-1111-111111111111";
const person = (
  id: string,
  first: string,
  gender: string,
  parents: string[] = [],
  spouses: string[] = [],
  birth: string | null = null,
) => ({
  id,
  tree_id: TREE,
  kind: "human",
  species: null,
  first_name: first,
  last_name: "Martin",
  gender,
  birth,
  birth_time: null,
  birth_place: null,
  death: null,
  job: null,
  notes: null,
  photo_path: null,
  origins: ["FR"],
  parent_ids: parents,
  spouse_ids: spouses,
});
const PEOPLE = [
  person("a1", "Henri", "m", [], ["a2"], "1931"),
  person("a2", "Jeanne", "f", [], ["a1"], "1934"),
  person("b1", "Paul", "m", ["a1", "a2"], ["b2"], "1958"),
  person("b2", "Sophie", "f", [], ["b1"], "1961"),
  person("b3", "Claire", "f", ["a1", "a2"], [], "1963"),
  person("c1", "Lucas", "m", ["b1", "b2"], [], "1988"),
  person("c2", "Emma", "f", ["b1", "b2"], [], "1991"),
];

export async function mockTree(page: Page, preset: string) {
  const tree = { id: TREE, title: "Famille Martin", root_id: "c1", link_access: "view", settings: { preset } };
  await page.route("**/rest/v1/**", (route) => {
    const url = route.request().url();
    const one = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const body = url.includes("/trees") ? (one ? tree : [tree]) : url.includes("/people") ? PEOPLE : [];
    return route.fulfill({ json: body });
  });
}

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
