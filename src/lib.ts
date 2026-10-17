export type Person = {
  id: string; tree_id: string; kind: "human" | "pet"; species: string | null;
  first_name: string; last_name: string; gender: "m" | "f" | "u";
  birth: string | null; birth_time: string | null; birth_place: string | null;
  death: string | null; job: string | null; notes: string | null;
  origins: string[]; parent_ids: string[]; spouse_ids: string[];
};
export type Tree = { id: string; title: string; root_id: string | null; link_access: string; settings: { preset?: string } };

export const SPECIES: Record<string, string> = {
  chien: "🐶", chat: "🐱", oiseau: "🦜", poisson: "🐠", tortue: "🐢", cheval: "🐴", lapin: "🐰", autre: "🐾",
};
export const flag = (c: string) =>
  c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) : c;

export const W = 156, H = 178, GX = 28, ROW = 250;

// Génération de chaque personne (0 = personne racine, -1 = parents, +1 = enfants)
export function gens(people: Person[], rootId: string | null) {
  const by = new Map(people.map((p) => [p.id, p]));
  const g = new Map<string, number>();
  const root = rootId && by.has(rootId) ? rootId : people[0]?.id;
  if (!root) return g;
  g.set(root, 0);
  const q = [root];
  while (q.length) {
    const id = q.shift()!, n = g.get(id)!, p = by.get(id)!;
    const next: [string, number][] = [
      ...p.parent_ids.map((x) => [x, n - 1] as [string, number]),
      ...p.spouse_ids.map((x) => [x, n] as [string, number]),
      ...people.filter((c) => c.parent_ids.includes(id)).map((c) => [c.id, n + 1] as [string, number]),
    ];
    for (const [i, gi] of next) if (by.has(i) && !g.has(i)) { g.set(i, gi); q.push(i); }
  }
  people.forEach((p) => !g.has(p.id) && g.set(p.id, 0));
  return g;
}

// Placement : couples côte à côte, enfants centrés sous leurs parents, sans chevauchement
export function layout(people: Person[], rootId: string | null) {
  const g = gens(people, rootId);
  const by = new Map(people.map((p) => [p.id, p]));
  const pos = new Map<string, { x: number; y: number }>();
  const levels = [...new Set(g.values())].sort((a, b) => a - b);
  levels.forEach((lv, row) => {
    const seen = new Set<string>();
    const units: Person[][] = [];
    for (const p of people.filter((x) => g.get(x.id) === lv)) {
      if (seen.has(p.id)) continue;
      const u = [p]; seen.add(p.id);
      for (const s of p.spouse_ids) {
        const sp = by.get(s);
        if (sp && !seen.has(s) && g.get(s) === lv) { u.push(sp); seen.add(s); }
      }
      units.push(u);
    }
    const uw = (u: Person[]) => u.length * W + (u.length - 1) * GX;
    const want = (u: Person[]) => {
      const xs = u.flatMap((m) => m.parent_ids).map((i) => pos.get(i)?.x).filter((x): x is number => x !== undefined);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length + W / 2 - uw(u) / 2 : undefined;
    };
    const items = units.map((u) => ({ u, d: want(u) }));
    items.sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));
    let cur = -1e9;
    for (const { u, d } of items) {
      const left = d === undefined ? (cur < -1e8 ? 0 : cur) : Math.max(d, cur);
      u.forEach((m, i) => pos.set(m.id, { x: left + i * (W + GX), y: row * ROW }));
      cur = left + uw(u) + GX;
    }
  });
  const minX = Math.min(0, ...[...pos.values()].map((p) => p.x));
  pos.forEach((p) => (p.x -= minX));
  return pos;
}

export function relation(people: Person[], rootId: string | null, p: Person): string {
  if (p.kind === "pet") return "Animal";
  if (!rootId) return "";
  if (p.id === rootId) return "Vous";
  const by = new Map(people.map((x) => [x.id, x]));
  const anc = (id: string) => {
    const m = new Map([[id, 0]]); const q = [id];
    while (q.length) {
      const c = q.shift()!;
      for (const par of by.get(c)?.parent_ids ?? []) if (by.has(par) && !m.has(par)) { m.set(par, m.get(c)! + 1); q.push(par); }
    }
    return m;
  };
  const a = anc(rootId), b = anc(p.id);
  let best: [number, number] | null = null;
  for (const [id, da] of a) { const db = b.get(id); if (db !== undefined && (!best || da + db < best[0] + best[1])) best = [da, db]; }
  const g = (m: string, w: string) => (p.gender === "f" ? w : m);
  if (best) {
    const [da, db] = best;
    if (db === 0) return da === 1 ? g("Père", "Mère") : da === 2 ? g("Grand-père", "Grand-mère") : g("Arrière-grand-père", "Arrière-grand-mère");
    if (da === 0) return db === 1 ? g("Fils", "Fille") : db === 2 ? g("Petit-fils", "Petite-fille") : g("Arrière-petit-fils", "Arrière-petite-fille");
    if (da === 1 && db === 1) return g("Frère", "Sœur");
    if (da === 2 && db === 1) return g("Oncle", "Tante");
    if (da === 1 && db === 2) return g("Neveu", "Nièce");
    if (da === 2 && db === 2) return g("Cousin", "Cousine");
  }
  if (p.spouse_ids.includes(rootId)) return g("Conjoint", "Conjointe");
  const sp = p.spouse_ids.map((i) => by.get(i)).find(Boolean);
  return sp ? `Conjoint(e) de ${sp.first_name}` : "";
}
