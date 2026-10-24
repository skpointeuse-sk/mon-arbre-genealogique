import type { Page, Route } from "@playwright/test";

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

/* Session factice de propriétaire : la barre d'outils complète s'affiche, sans compte réel. */
export async function mockOwner(page: Page) {
  const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "test@example.com" };
  const session = {
    access_token: "test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "test",
    user,
  };
  await page.addInitScript((s) => localStorage.setItem("sb-nyboahgdnqivjliqcrtd-auth-token", s), JSON.stringify(session));
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: user }));
  const members = [
    { user_id: "u1", role: "owner" },
    { user_id: "u2", role: "editor" },
  ];
  const json = (route: Route, body: unknown) => route.fulfill({ json: body });
  await page.route("**/rest/v1/tree_members**", (route) =>
    // Avec un filtre sur user_id, l'appli demande son propre rôle ; sinon, la liste des membres.
    json(
      route,
      !route.request().url().includes("user_id=eq.")
        ? members
        : (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object")
          ? { role: "owner" }
          : [{ role: "owner" }],
    ),
  );
  await page.route("**/rest/v1/profiles**", (route) =>
    json(route, [
      { id: "u1", display_name: "Steven", email: "test@example.com" },
      { id: "u2", display_name: "Mamie Jeanne", email: "mamie@example.com" },
    ]),
  );
  await page.route("**/rest/v1/tree_invites**", (route) => json(route, [{ id: "i1", email: "oncle@example.com", role: "viewer" }]));
  await page.route("**/rest/v1/tree_events**", (route) =>
    json(route, [
      {
        id: 2,
        user_id: "u2",
        at: "2026-10-24T10:00:00Z",
        kind: "modification",
        target: "personne",
        label: "Paul Martin",
        fields: ["birth", "job"],
      },
      { id: 1, user_id: "u1", at: "2026-10-23T09:00:00Z", kind: "ajout", target: "personne", label: "Emma Martin", fields: [] },
    ]),
  );
}
