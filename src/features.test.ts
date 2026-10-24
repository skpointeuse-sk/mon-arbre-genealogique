import { describe, expect, it } from "vitest";
import { type Person, type Union, toGedcom } from "./lib";
import { frDate, parseGedcom } from "./gedcom";
import { checkFamily } from "./check";
import { fileName, scopePeople } from "./exporting";
import { rolesFor } from "./members";
import { describe as tell } from "./history";
import { initials } from "./usePresence";
import { pairKey, plan } from "./undo";

const person = (id: string, first: string, extra: Partial<Person> = {}): Person => ({
  id,
  tree_id: "t",
  kind: "human",
  species: null,
  first_name: first,
  last_name: "Martin",
  gender: "u",
  birth: null,
  birth_time: null,
  birth_place: null,
  death: null,
  job: null,
  notes: null,
  photo_path: null,
  origins: [],
  parent_ids: [],
  spouse_ids: [],
  ...extra,
});

describe("dates GEDCOM", () => {
  it("convertit les formats courants", () => {
    expect(frDate("12 MAR 1950")).toBe("12/03/1950");
    expect(frDate("3 jan 1901")).toBe("03/01/1901");
    expect(frDate("ABT 1900")).toBe("vers 1900");
    expect(frDate("BEF 5 JUN 1880")).toBe("avant 05/06/1880");
    expect(frDate("MAR 1950")).toBe("03/1950");
    expect(frDate("1950")).toBe("1950");
    expect(frDate("FROM 1900 TO 1910")).toBe("FROM 1900 TO 1910");
  });
});

describe("import GEDCOM", () => {
  const sample = [
    "0 HEAD",
    "1 CHAR UTF-8",
    "0 @I1@ INDI",
    "1 NAME Henri Louis /Martin/",
    "1 SEX M",
    "1 BIRT",
    "2 DATE 2 FEB 1931",
    "2 PLAC Lyon",
    "1 DEAT",
    "2 DATE 2009",
    "1 OCCU Menuisier",
    "0 @I2@ INDI",
    "1 NAME Jeanne /Durand/",
    "1 SEX F",
    "0 @I3@ INDI",
    "1 NAME Paul /Martin/",
    "1 SEX M",
    "1 DEAT Y",
    "0 @I4@ INDI",
    "1 NAME //",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "1 CHIL @I3@",
    "0 TRLR",
  ].join("\r\n");

  it("lit les personnes et leurs familles", () => {
    const { people, skipped } = parseGedcom(sample, "t");
    expect(people).toHaveLength(3);
    expect(skipped).toBe(1);
    const [henri, jeanne, paul] = people;
    expect(henri).toMatchObject({
      first_name: "Henri Louis",
      last_name: "Martin",
      gender: "m",
      birth: "02/02/1931",
      birth_place: "Lyon",
      death: "2009",
      job: "Menuisier",
    });
    expect(henri.spouse_ids).toEqual([jeanne.id]);
    expect(jeanne.spouse_ids).toEqual([henri.id]);
    expect(paul.parent_ids).toEqual([henri.id, jeanne.id]);
    expect(paul.death).toBe("Décédé");
  });

  it("relit ce que l'application exporte", () => {
    const a = person("a", "Henri", { gender: "m", birth: "02/02/1931", spouse_ids: ["b"] });
    const b = person("b", "Jeanne", { gender: "f", spouse_ids: ["a"] });
    const c = person("c", "Paul", { gender: "m", parent_ids: ["a", "b"] });
    const { people } = parseGedcom(toGedcom([a, b, c]), "t");
    expect(people.map((p) => p.first_name)).toEqual(["Henri", "Jeanne", "Paul"]);
    expect(people[0].birth).toBe("02/02/1931");
    expect(people[2].parent_ids).toHaveLength(2);
  });
});

describe("vérificateur de cohérence", () => {
  const today = new Date(2026, 9, 24);
  it("ne signale rien sur une famille ordinaire", () => {
    const m = person("m", "Jeanne", { gender: "f", birth: "1934" });
    const c = person("c", "Paul", { birth: "1958", parent_ids: ["m"] });
    expect(checkFamily([m, c], [], today)).toEqual([]);
  });
  it("repère les dates impossibles ou douteuses", () => {
    const m = person("m", "Jeanne", { gender: "f", birth: "1950", death: "1960" });
    const c = person("c", "Paul", { birth: "1962", parent_ids: ["m"] });
    const old = person("o", "Louis", { birth: "1900" });
    const inv = person("i", "Rose", { birth: "1980", death: "1970" });
    const young = person("y", "Lucie", { gender: "f", birth: "1990" });
    const kid = person("k", "Léo", { birth: "2001", parent_ids: ["y"] });
    const u: Union = { tree_id: "t", person_a: "i", person_b: "o", type: "mariage", date: "1990", place: null, notes: null };
    const texts = checkFamily([m, c, old, inv, young, kid], [u], today).map((a) => a.text);
    expect(texts.some((t) => t.includes("après le décès de sa mère"))).toBe(true);
    expect(texts.some((t) => t.includes("plus de 110 ans"))).toBe(true);
    expect(texts.some((t) => t.includes("précède la date de naissance"))).toBe(true);
    expect(texts.some((t) => t.includes("moins de 13 ans"))).toBe(true);
    expect(texts.some((t) => t.includes("après son décès"))).toBe(true);
  });
  it("tolère une même année de naissance et de décès", () => {
    expect(checkFamily([person("x", "Bébé", { birth: "1920", death: "1920" })], [], today)).toEqual([]);
  });
});

describe("import GEDCOM, fichiers Windows", () => {
  it("ignore la marque d'ordre des octets en début de fichier", () => {
    expect(parseGedcom("﻿0 @I1@ INDI\n1 NAME Rose /Petit/", "t").people).toHaveLength(1);
  });
});

describe("choix de l'export", () => {
  // Arrière-grand-père > grand-père > père (+ mère) > moi > fils > petite-fille ; une tante à côté.
  const fam = [
    person("ag", "Arsène"),
    person("gp", "Henri", { parent_ids: ["ag"] }),
    person("pe", "Paul", { parent_ids: ["gp"], spouse_ids: ["me"] }),
    person("me", "Sophie", { spouse_ids: ["pe"] }),
    person("ta", "Claire", { parent_ids: ["gp"] }),
    person("mo", "Lucas", { parent_ids: ["pe", "me"], spouse_ids: ["co"] }),
    person("co", "Inès", { spouse_ids: ["mo"] }),
    person("fi", "Hugo", { parent_ids: ["mo", "co"] }),
    person("pf", "Léa", { parent_ids: ["fi"] }),
  ];
  const ids = (l: Person[]) => l.map((p) => p.id).sort();

  it("garde tout l'arbre par défaut", () => {
    expect(scopePeople(fam, "mo", 0, "all")).toBe(fam);
  });
  it("ascendance sur 3 générations : moi, parents, grands-parents", () => {
    expect(ids(scopePeople(fam, "mo", 3, "up"))).toEqual(["gp", "me", "mo", "pe"]);
  });
  it("descendance complète avec les conjoints", () => {
    expect(ids(scopePeople(fam, "mo", 0, "down"))).toEqual(["co", "fi", "mo", "pf"]);
  });
  it("vue globale sur 3 générations : des grands-parents aux petits-enfants", () => {
    expect(ids(scopePeople(fam, "mo", 3, "all"))).toEqual(["co", "fi", "gp", "me", "mo", "pe", "pf", "ta"]);
  });
  it("retire les liens vers les personnes hors cadre", () => {
    const pe = scopePeople(fam, "mo", 3, "up").find((p) => p.id === "pe")!;
    expect(pe.spouse_ids).toEqual(["me"]);
    expect(scopePeople(fam, "mo", 3, "up").find((p) => p.id === "gp")!.parent_ids).toEqual([]);
  });
  it("donne un nom de fichier lisible", () => {
    expect(fileName("Famille Lefèvre & co", "a2")).toBe("famille-lefevre-co-a2.pdf");
    expect(fileName("", "png")).toBe("mon-arbre.png");
  });
});

describe("droits sur les membres", () => {
  it("suit les mêmes règles que la base", () => {
    expect(rolesFor("owner", "owner")).toEqual([]);
    expect(rolesFor("owner", "editor")).toEqual(["co_lead", "editor", "viewer"]);
    expect(rolesFor("co_lead", "co_lead")).toEqual([]);
    expect(rolesFor("co_lead", "viewer")).toEqual(["editor", "viewer"]);
    expect(rolesFor("editor", "viewer")).toEqual([]);
  });
});

describe("phrases de l'historique", () => {
  const e = { id: 1, user_id: null, at: "", label: "Paul Martin", fields: [] as string[] };
  it("raconte chaque type de changement", () => {
    expect(tell({ ...e, kind: "ajout", target: "personne" })).toBe("a ajouté Paul Martin");
    expect(tell({ ...e, kind: "modification", target: "personne", fields: ["death", "notes"] })).toBe(
      "a modifié Paul Martin (décès, notes)",
    );
    expect(tell({ ...e, kind: "modification", target: "membre", fields: ["viewer"] })).toBe("a passé Paul Martin en « lecture seule »");
    expect(tell({ ...e, label: "", kind: "modification", target: "arbre", fields: ["settings"] })).toBe("a changé ambiance");
  });
});

describe("initiales de présence", () => {
  it("prend la première lettre de chaque mot", () => {
    expect(initials("Testeur A")).toBe("TA");
    expect(initials("jean-marc")).toBe("JM");
    expect(initials("Jeanne")).toBe("JE");
    expect(initials("")).toBe("?");
  });
});

describe("annuler à plusieurs", () => {
  const P = (id: string, extra: Partial<Person> = {}) => person(id, id, extra);
  const U = (a: string, b: string, type = "mariage"): Union => ({
    tree_id: "t",
    person_a: a,
    person_b: b,
    type,
    date: null,
    place: null,
    notes: null,
  });

  it("n'annule que la fiche modifiée par l'action", () => {
    const before = { people: [P("a"), P("b")], unions: [] };
    const after = { people: [P("a", { job: "Boulanger" }), P("b")], unions: [] };
    // Pendant ce temps, quelqu'un d'autre a ajouté c et modifié b.
    const cur = { people: [P("a", { job: "Boulanger" }), P("b", { job: "Maçon" }), P("c")], unions: [] };
    const p = plan(after, before, cur);
    expect(p.upsertPeople.map((x) => [x.id, x.job])).toEqual([["a", null]]);
    expect(p.deletePeople).toEqual([]);
    expect(p.conflicts).toEqual([]);
  });
  it("n'écrase pas une fiche changée entre-temps par un autre", () => {
    const before = { people: [P("a")], unions: [] };
    const after = { people: [P("a", { job: "Boulanger" })], unions: [] };
    const cur = { people: [P("a", { job: "Pâtissier" })], unions: [] };
    const p = plan(after, before, cur);
    expect(p.upsertPeople).toEqual([]);
    expect(p.conflicts).toEqual(["a Martin"]);
  });
  it("remet une personne supprimée avec ses unions, retire un ajout", () => {
    const before = { people: [P("a"), P("b")], unions: [U("a", "b")] };
    const after = { people: [P("a"), P("n")], unions: [] };
    const p = plan(after, before, after);
    expect(p.upsertPeople.map((x) => x.id)).toEqual(["b"]);
    expect(p.deletePeople).toEqual(["n"]);
    expect(p.upsertUnions.map(pairKey)).toEqual(["a|b"]);
  });
  it("rétablir rejoue l'action", () => {
    const before = { people: [P("a")], unions: [] };
    const after = { people: [P("a", { job: "Boulanger" })], unions: [] };
    expect(plan(before, after, before).upsertPeople[0].job).toBe("Boulanger");
  });
});
