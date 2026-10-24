import { describe, expect, it } from "vitest";
import { DATE_RE, H, W, gens, layout, lifespan, longDate, relation, toGedcom, type Person } from "./lib";

let n = 0;
const person = (first: string, extra: Partial<Person> = {}): Person => ({
  id: extra.id ?? `p${++n}`, tree_id: "t", kind: "human", species: null,
  first_name: first, last_name: "Martin", gender: "u",
  birth: null, birth_time: null, birth_place: null, death: null, job: null, notes: null,
  photo_path: null, origins: [], parent_ids: [], spouse_ids: [], ...extra,
});

/* Une famille sur quatre générations, avec un couple de chaque côté. */
function family() {
  const gpa = person("Henri", { id: "gpa", gender: "m", spouse_ids: ["gma"] });
  const gma = person("Jeanne", { id: "gma", gender: "f", spouse_ids: ["gpa"] });
  const dad = person("Paul", { id: "dad", gender: "m", parent_ids: ["gpa", "gma"], spouse_ids: ["mum"] });
  const mum = person("Sophie", { id: "mum", gender: "f", spouse_ids: ["dad"] });
  const aunt = person("Claire", { id: "aunt", gender: "f", parent_ids: ["gpa", "gma"] });
  const me = person("Lucas", { id: "me", gender: "m", parent_ids: ["dad", "mum"] });
  const sis = person("Emma", { id: "sis", gender: "f", parent_ids: ["dad", "mum"] });
  const cousin = person("Hugo", { id: "cousin", gender: "m", parent_ids: ["aunt"] });
  const kid = person("Léo", { id: "kid", gender: "m", parent_ids: ["me"] });
  const dog = person("Rex", { id: "dog", kind: "pet", species: "chien", parent_ids: ["me"] });
  return [gpa, gma, dad, mum, aunt, me, sis, cousin, kid, dog];
}

describe("gens", () => {
  it("place la racine à 0, ses parents à -1 et ses enfants à +1", () => {
    const g = gens(family(), "me");
    expect(g.get("me")).toBe(0);
    expect(g.get("dad")).toBe(-1);
    expect(g.get("gpa")).toBe(-2);
    expect(g.get("kid")).toBe(1);
    expect(g.get("cousin")).toBe(0);
  });

  it("donne une génération aux branches sans lien avec la racine", () => {
    const lone = person("Isolé", { id: "lone" });
    const g = gens([...family(), lone], "me");
    expect(g.has("lone")).toBe(true);
  });
});

describe("layout", () => {
  const people = family();
  const { pos } = layout(people, "me");

  it("place tout le monde", () => {
    for (const p of people) expect(pos.has(p.id)).toBe(true);
  });

  it("ne superpose aucune carte sur une même rangée", () => {
    const rows = new Map<number, number[]>();
    for (const { x, y } of pos.values()) rows.set(y, [...(rows.get(y) ?? []), x]);
    for (const xs of rows.values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(W);
    }
  });

  it("met les parents au-dessus de leurs enfants", () => {
    expect(pos.get("gpa")!.y).toBeLessThan(pos.get("dad")!.y);
    expect(pos.get("dad")!.y).toBeLessThan(pos.get("me")!.y);
    expect(pos.get("me")!.y + H).toBeLessThanOrEqual(pos.get("kid")!.y);
  });

  it("garde les conjoints sur la même rangée", () => {
    expect(pos.get("dad")!.y).toBe(pos.get("mum")!.y);
  });

  it("supporte un arbre vide", () => {
    expect(layout([], null).pos.size).toBe(0);
  });
});

describe("relation", () => {
  const people = family();
  const of = (id: string) => relation(people, "me", people.find((p) => p.id === id)!);

  it("nomme les liens directs", () => {
    expect(of("me")).toBe("Vous");
    expect(of("dad")).toBe("Père");
    expect(of("mum")).toBe("Mère");
    expect(of("gpa")).toBe("Grand-père");
    expect(of("kid")).toBe("Fils");
  });

  it("nomme la fratrie et les collatéraux", () => {
    expect(of("sis")).toBe("Sœur");
    expect(of("aunt")).toBe("Tante");
    expect(of("cousin")).toBe("Cousin germain");
  });

  it("reconnaît un animal de compagnie", () => {
    expect(of("dog")).toBe("Chien");
  });

  it("repère les demi-frères et demi-sœurs", () => {
    const other = person("Nina", { id: "other", gender: "f" });
    const half = person("Zoé", { id: "half", gender: "f", parent_ids: ["dad", "other"] });
    const all = [...people, other, half];
    expect(relation(all, "me", half)).toBe("Demi-sœur");
  });

  it("monte les arrière-grands-parents", () => {
    const ggpa = person("Louis", { id: "ggpa", gender: "m" });
    const all = people.map((p) => (p.id === "gpa" ? { ...p, parent_ids: ["ggpa"] } : p));
    expect(relation([...all, ggpa], "me", ggpa)).toBe("Arrière-grand-père");
  });
});

describe("dates", () => {
  it("accepte les formats conseillés", () => {
    for (const d of ["1958", "03/1958", "12/03/1958", "vers 1900", "avant 1850"]) expect(DATE_RE.test(d)).toBe(true);
    expect(DATE_RE.test("hier")).toBe(false);
  });

  it("écrit les dates en toutes lettres", () => {
    expect(longDate("01/05/1990")).toBe("1er mai 1990");
    expect(longDate("12/03/1958")).toBe("12 mars 1958");
  });

  it("résume une vie", () => {
    expect(lifespan(person("A", { birth: "1931", death: "2009" }))).toBe("1931 – 2009");
    expect(lifespan(person("B", { gender: "f", birth: "1961" }))).toBe("Née en 1961");
  });
});

describe("toGedcom", () => {
  it("produit un fichier GEDCOM 5.5.1 avec individus et familles", () => {
    const out = toGedcom(family());
    expect(out.startsWith("0 HEAD\n1 GEDC\n2 VERS 5.5.1")).toBe(true);
    expect(out).toContain("1 NAME Lucas /Martin/");
    expect(out).toContain("FAM\n");
    expect(out).not.toContain("Rex");
    expect(out.trimEnd().endsWith("0 TRLR")).toBe(true);
  });
});
