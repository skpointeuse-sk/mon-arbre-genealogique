import { type Person, type Union, fullName } from "./lib";

/* Annuler / Rétablir à plusieurs. Chaque action garde l'état d'avant et d'après ; annuler ne
   touche qu'aux lignes que cette action a changées. Une ligne modifiée entre-temps par
   quelqu'un d'autre n'est pas écrasée : elle est signalée comme conflit. */
export type Snapshot = { people: Person[]; unions: Union[] };
export type Step = { before: Snapshot; after: Snapshot | null };
export type Plan = { upsertPeople: Person[]; deletePeople: string[]; upsertUnions: Union[]; deleteUnions: Union[]; conflicts: string[] };

export const pairKey = (u: Pick<Union, "person_a" | "person_b">) => u.person_a + "|" + u.person_b;

// Comparaison sur le contenu, sans les horodatages posés par la base.
const sig = (r: object | undefined) =>
  r === undefined
    ? ""
    : JSON.stringify(
        Object.entries(r)
          .filter(([k]) => k !== "updated_at" && k !== "created_at")
          .sort(([a], [b]) => a.localeCompare(b)),
      );

function diff<T extends object>(from: T[], to: T[], cur: T[], key: (x: T) => string) {
  const F = new Map(from.map((x) => [key(x), x])),
    T = new Map(to.map((x) => [key(x), x])),
    C = new Map(cur.map((x) => [key(x), x]));
  const upsert: T[] = [],
    remove: T[] = [],
    conflicts: T[] = [];
  for (const k of new Set([...F.keys(), ...T.keys()])) {
    const f = F.get(k),
      t = T.get(k),
      c = C.get(k);
    if (sig(f) === sig(t)) continue; // l'action n'a pas touché cette ligne
    if (sig(c) !== sig(f)) {
      // Quelqu'un l'a changée depuis : on ne revient pas en arrière dessus.
      conflicts.push((c ?? f ?? t)!);
      continue;
    }
    if (t) upsert.push(t);
    else if (c) remove.push(c);
  }
  return { upsert, remove, conflicts };
}

/* Ce qu'il faut écrire pour passer de `from` à `to`, sachant que la base est à `cur`. */
export function plan(from: Snapshot, to: Snapshot, cur: Snapshot): Plan {
  const p = diff(from.people, to.people, cur.people, (x) => x.id);
  const u = diff(from.unions, to.unions, cur.unions, pairKey);
  const names = new Map([...to.people, ...from.people, ...cur.people].map((x) => [x.id, fullName(x)]));
  return {
    upsertPeople: p.upsert,
    deletePeople: p.remove.map((x) => x.id),
    upsertUnions: u.upsert,
    deleteUnions: u.remove,
    conflicts: [
      ...p.conflicts.map((x) => fullName(x)),
      ...u.conflicts.map((x) => `l'union de ${names.get(x.person_a) ?? "?"} et ${names.get(x.person_b) ?? "?"}`),
    ],
  };
}
