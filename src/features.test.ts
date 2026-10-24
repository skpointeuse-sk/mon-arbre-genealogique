import { describe, expect, it } from "vitest";
import { type Person, type Union, toGedcom } from "./lib";
import { frDate, parseGedcom } from "./gedcom";
import { checkFamily } from "./check";

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
