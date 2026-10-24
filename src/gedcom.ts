import { type NewPerson, uid } from "./lib";

/* Lecture d'un fichier GEDCOM 5.5 / 5.5.1 (Geneanet, Filae, Heredis, MyHeritage).
   On garde ce que l'application sait afficher : nom, sexe, naissance, décès, métier,
   familles. Le reste du fichier est ignoré sans erreur. */

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};
const QUAL: Record<string, string> = { ABT: "vers", EST: "vers", CAL: "vers", BEF: "avant", AFT: "après" };

// « 12 MAR 1950 » → « 12/03/1950 », « ABT 1900 » → « vers 1900 ». Sinon le texte d'origine.
export function frDate(g: string): string {
  const s = g.trim().toUpperCase();
  const q = s.match(/^(ABT|EST|CAL|BEF|AFT)\s+(.*)$/);
  if (q) return `${QUAL[q[1]]} ${frDate(q[2])}`;
  const full = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (full && MONTHS[full[2]]) return `${full[1].padStart(2, "0")}/${MONTHS[full[2]]}/${full[3]}`;
  const my = s.match(/^([A-Z]{3})\s+(\d{4})$/);
  if (my && MONTHS[my[1]]) return `${MONTHS[my[1]]}/${my[2]}`;
  const y = s.match(/^(\d{4})$/);
  if (y) return y[1];
  return g.trim();
}

type Line = { level: number; xref?: string; tag: string; value: string };
const parseLine = (raw: string): Line | null => {
  const m = raw.match(/^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/);
  return m ? { level: +m[1], xref: m[2], tag: m[3].toUpperCase(), value: (m[4] ?? "").trim() } : null;
};

export type GedcomResult = { people: NewPerson[]; skipped: number };

export function parseGedcom(text: string, treeId: string): GedcomResult {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\r|\n/)
    .map(parseLine)
    .filter((l): l is Line => !!l);
  type Rec = { tag: string; xref: string; lines: Line[] };
  const recs: Rec[] = [];
  for (const l of lines) {
    if (l.level === 0) recs.push({ tag: l.value || l.tag, xref: l.xref ?? "", lines: [] });
    else recs[recs.length - 1]?.lines.push(l);
  }

  const byXref = new Map<string, NewPerson>();
  let skipped = 0;
  for (const r of recs.filter((x) => x.tag === "INDI" && x.xref)) {
    const p: NewPerson = {
      id: uid(),
      tree_id: treeId,
      kind: "human",
      gender: "u",
      origins: [],
      parent_ids: [],
      spouse_ids: [],
      first_name: "",
      last_name: "",
    };
    let event = "";
    for (const l of r.lines) {
      if (l.level === 1) {
        event = l.tag;
        if (l.tag === "NAME" && !p.first_name && !p.last_name) {
          const m = l.value.match(/^([^/]*)(?:\/([^/]*)\/)?(.*)$/);
          p.first_name = (m?.[1] ?? "").trim();
          p.last_name = (m?.[2] ?? "").trim();
          if (!p.first_name && !p.last_name) p.first_name = l.value.replace(/\//g, "").trim();
        }
        if (l.tag === "SEX") p.gender = l.value.startsWith("M") ? "m" : l.value.startsWith("F") ? "f" : "u";
        if (l.tag === "OCCU" && l.value) p.job = l.value.slice(0, 200);
        if (l.tag === "NOTE" && l.value && !l.value.startsWith("@")) p.notes = l.value.slice(0, 2000);
      } else if (l.level === 2) {
        if (event === "NAME" && l.tag === "GIVN" && l.value) p.first_name = l.value;
        if (event === "NAME" && l.tag === "SURN" && l.value) p.last_name = l.value;
        if (event === "BIRT" && l.tag === "DATE") p.birth = frDate(l.value);
        if (event === "BIRT" && l.tag === "PLAC") p.birth_place = l.value.slice(0, 200);
        if (event === "DEAT" && l.tag === "DATE") p.death = frDate(l.value);
        if (event === "DEAT" && l.tag === "PLAC") p.death_place = l.value.slice(0, 200);
        if (event === "NOTE" && (l.tag === "CONT" || l.tag === "CONC") && p.notes)
          p.notes = (p.notes + (l.tag === "CONT" ? "\n" : "") + l.value).slice(0, 2000);
      }
    }
    // Un décès signalé sans date (« 1 DEAT Y ») reste un décès.
    if (!p.death && r.lines.some((l) => l.level === 1 && l.tag === "DEAT")) p.death = "Décédé" + (p.gender === "f" ? "e" : "");
    if (!p.first_name && !p.last_name) {
      skipped++;
      continue;
    }
    byXref.set(r.xref, p);
  }

  for (const r of recs.filter((x) => x.tag === "FAM")) {
    const get = (tag: string) =>
      r.lines
        .filter((l) => l.level === 1 && l.tag === tag)
        .map((l) => byXref.get(l.value))
        .filter((p): p is NewPerson => !!p);
    const parents = [...get("HUSB"), ...get("WIFE")];
    for (const a of parents) for (const b of parents) if (a !== b && !a.spouse_ids.includes(b.id)) a.spouse_ids = [...a.spouse_ids, b.id];
    for (const c of get("CHIL")) for (const par of parents) if (!c.parent_ids.includes(par.id)) c.parent_ids = [...c.parent_ids, par.id];
  }
  return { people: [...byXref.values()], skipped };
}
