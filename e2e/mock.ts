import type { Page } from "@playwright/test";

/* Arbre fictif servi à la place de Supabase : on voit le canevas sans compte ni réseau. */
export const TREE = "11111111-1111-1111-1111-111111111111";
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
