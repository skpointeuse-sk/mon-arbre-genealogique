/* Données, placement de l'arbre et outils. Le schéma Supabase est inchangé. */

export type Person = {
  id: string;
  tree_id: string;
  kind: "human" | "pet";
  species: string | null;
  first_name: string;
  last_name: string;
  gender: "m" | "f" | "u";
  birth: string | null;
  birth_time: string | null;
  birth_place: string | null;
  death: string | null;
  job: string | null;
  notes: string | null;
  photo_path: string | null;
  origins: string[];
  parent_ids: string[];
  spouse_ids: string[];
};
/* Ligne à insérer dans la table people : seuls les champs connus à la création sont remplis. */
export type NewPerson = Partial<Person> & Pick<Person, "id" | "tree_id" | "kind" | "gender" | "origins" | "parent_ids" | "spouse_ids">;
export type Tree = { id: string; title: string; root_id: string | null; link_access: string; settings: { preset?: string } | null };
export type Union = {
  tree_id: string;
  person_a: string;
  person_b: string;
  type: string;
  date: string | null;
  place: string | null;
  notes: string | null;
};

export const SPECIES: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseau: "Oiseau",
  poisson: "Poisson",
  tortue: "Tortue",
  cheval: "Cheval",
  lapin: "Lapin",
  autre: "Autre animal",
};
export const UNIONS: [string, string][] = [
  ["mariage", "Mariage civil"],
  ["mariage-religieux", "Mariage religieux"],
  ["pacs", "PACS"],
  ["union-libre", "Union libre"],
  ["fiancailles", "Fiançailles"],
  ["divorce", "Divorcés"],
  ["separation", "Séparés"],
];
export const unionLabel = (t?: string) => UNIONS.find(([k]) => k === t)?.[1] ?? "Union";

/* Les tableaux venant de la base peuvent être nuls : on normalise une fois. */
export const clean = (p: Person): Person => ({
  ...p,
  first_name: p.first_name ?? "",
  last_name: p.last_name ?? "",
  gender: p.gender === "m" || p.gender === "f" ? p.gender : "u",
  origins: Array.isArray(p.origins) ? p.origins : [],
  parent_ids: Array.isArray(p.parent_ids) ? p.parent_ids : [],
  spouse_ids: Array.isArray(p.spouse_ids) ? p.spouse_ids : [],
});

export const fullName = (p: Person) => [p.first_name, p.last_name].filter(Boolean).join(" ") || "Sans nom";

let regions: Intl.DisplayNames | null = null;
export const country = (code: string) => {
  try {
    regions ??= new Intl.DisplayNames(["fr"], { type: "region" });
    return /^[A-Za-z]{2}$/.test(code) ? (regions.of(code.toUpperCase()) ?? code) : code;
  } catch {
    return code;
  }
};

/* Dates : la base stocke du texte libre, le format conseillé est JJ/MM/AAAA. */
export const DATE_RE = /^((vers|avant|après|apres|env\.?|~)\s*)?((\d{1,2}\/)?\d{1,2}\/)?\d{4}$/i;
export const year = (d: string | null) => d?.match(/(\d{4})\s*$/)?.[1] ?? "";
export const lifespan = (p: Person) => {
  const b = year(p.birth),
    d = year(p.death);
  if (b && d) return `${b} – ${d}`;
  if (b) return p.death ? `${b} – ?` : `Né${p.gender === "f" ? "e" : ""} en ${b}`;
  if (d) return `Décès en ${d}`;
  return p.death ? "Décédé" + (p.gender === "f" ? "e" : "") : "";
};
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const longDate = (d: string | null) => {
  const m = d?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${+m[1] === 1 ? "1er" : +m[1]} ${MONTHS[+m[2] - 1]} ${m[3]}`;
  return d ?? "";
};
export const gedDate = (d: string) => {
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${+m[1]} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][+m[2] - 1]} ${m[3]}` : d;
};

/* ---------- Placement ---------- */
export const W = 196,
  H = 84,
  GX = 32,
  GU = 56,
  ROW = H + 92;

// Génération de chaque personne (0 = racine, -1 = parents, +1 = enfants)
export function gens(people: Person[], rootId: string | null) {
  const by = new Map(people.map((p) => [p.id, p]));
  const kids = new Map<string, string[]>();
  people.forEach((c) => c.parent_ids.forEach((pid) => kids.set(pid, [...(kids.get(pid) ?? []), c.id])));
  const g = new Map<string, number>();
  const start = (id: string) => {
    g.set(id, 0);
    const q = [id];
    while (q.length) {
      const cur = q.shift()!,
        n = g.get(cur)!,
        p = by.get(cur)!;
      const next: [string, number][] = [
        ...p.parent_ids.map((x) => [x, n - 1] as [string, number]),
        ...p.spouse_ids.map((x) => [x, n] as [string, number]),
        ...(kids.get(cur) ?? []).map((x) => [x, n + 1] as [string, number]),
      ];
      for (const [i, gi] of next)
        if (by.has(i) && !g.has(i)) {
          g.set(i, gi);
          q.push(i);
        }
    }
  };
  const root = rootId && by.has(rootId) ? rootId : people[0]?.id;
  if (root) start(root);
  // Branches sans lien avec la racine : chacune garde sa propre hiérarchie.
  for (const p of people) if (!g.has(p.id)) start(p.id);
  return g;
}

export type Pos = { x: number; y: number };
export type Family = { key: string; parents: string[]; children: string[] };
export type Layout = { pos: Map<string, Pos>; families: Family[]; width: number; height: number };

export function familiesOf(people: Person[]) {
  const by = new Set(people.map((p) => p.id));
  const fams = new Map<string, Family>();
  for (const c of people) {
    const par = c.parent_ids.filter((i) => by.has(i));
    if (!par.length) continue;
    const key = [...par].sort().join("|");
    if (!fams.has(key)) fams.set(key, { key, parents: par, children: [] });
    fams.get(key)!.children.push(c.id);
  }
  return [...fams.values()];
}

/* Couples côte à côte, enfants centrés sous leurs parents, parents centrés au-dessus
   de leurs enfants. Plusieurs passes descendantes et montantes réduisent les croisements,
   puis chaque rangée est tassée sans chevauchement au plus près des positions voulues. */
export function layout(people: Person[], rootId: string | null): Layout {
  const g = gens(people, rootId);
  const by = new Map(people.map((p) => [p.id, p]));
  const kids = new Map<string, string[]>();
  people.forEach((c) => c.parent_ids.forEach((pid) => by.has(pid) && kids.set(pid, [...(kids.get(pid) ?? []), c.id])));
  const levels = [...new Set(g.values())].sort((a, b) => a - b);

  type Unit = { ids: string[]; w: number; x: number; hub?: string };
  const rows: Unit[][] = levels.map((lv) => {
    const inRow = people.filter((p) => g.get(p.id) === lv);
    const seen = new Set<string>();
    const units: Unit[] = [];
    for (const p of inRow) {
      if (seen.has(p.id)) continue;
      // Composante des conjoints sur cette rangée
      const comp: string[] = [];
      const st = [p.id];
      while (st.length) {
        const c = st.pop()!;
        if (seen.has(c)) continue;
        seen.add(c);
        comp.push(c);
        for (const s of by.get(c)!.spouse_ids) if (by.has(s) && g.get(s) === lv && !seen.has(s)) st.push(s);
      }
      // La personne aux conjoints multiples se retrouve au milieu
      const inComp = new Set(comp);
      const deg = (id: string) => by.get(id)!.spouse_ids.filter((s) => inComp.has(s)).length;
      let ordered = comp;
      let hub: string | undefined;
      if (comp.length > 2) {
        hub = comp.reduce((a, b) => (deg(b) > deg(a) ? b : a));
        const others = comp.filter((x) => x !== hub);
        const half = Math.floor(others.length / 2);
        ordered = [...others.slice(0, half), hub!, ...others.slice(half)];
      }
      units.push({ ids: ordered, w: ordered.length * W + (ordered.length - 1) * GX, x: 0, hub });
    }
    return units;
  });

  const center = new Map<string, number>();
  const commit = (row: Unit[]) => row.forEach((u) => u.ids.forEach((id, i) => center.set(id, u.x + i * (W + GX) + W / 2)));
  rows.forEach((row) => {
    let x = 0;
    row.forEach((u) => {
      u.x = x;
      x += u.w + GU;
    });
    commit(row);
  });

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const wantFrom = (u: Unit, dir: "up" | "down") => {
    const xs: number[] = [];
    // Pour un couple, chacun tire vers ses propres parents : on vise la moyenne pondérée par membre
    for (const id of u.ids) {
      const rel = dir === "down" ? by.get(id)!.parent_ids : (kids.get(id) ?? []);
      const own = rel.map((r) => center.get(r)).filter((c, k): c is number => c !== undefined && g.get(rel[k]) !== g.get(id));
      if (own.length) xs.push(mean(own) - (u.ids.indexOf(id) * (W + GX) + W / 2) + u.w / 2);
    }
    return xs.length ? mean(xs) : undefined;
  };
  // Dans un couple, chacun se place du côté de sa propre famille d'origine.
  const parentCenter = (id: string) => {
    const xs = by
      .get(id)!
      .parent_ids.map((r) => center.get(r))
      .filter((c): c is number => c !== undefined);
    return xs.length ? mean(xs) : undefined;
  };
  const orderMembers = (u: Unit) => {
    if (u.ids.length < 2) return;
    const hub = u.ids.length > 2 ? (u.hub ?? null) : null;
    if (!hub) {
      if (u.ids.length !== 2) return;
      const [a, b] = u.ids,
        ka = parentCenter(a),
        kb = parentCenter(b);
      if (ka !== undefined && kb !== undefined && ka > kb) u.ids = [b, a];
      return;
    }
    // Conjoints multiples : la personne reste au milieu, au plus deux conjoints de chaque côté équilibrés.
    const others = u.ids.filter((x) => x !== hub);
    const ref = parentCenter(hub);
    const known = others.filter((x) => parentCenter(x) !== undefined).sort((a, b) => parentCenter(a)! - parentCenter(b)!);
    const unknown = others.filter((x) => parentCenter(x) === undefined);
    const left: string[] = [],
      right: string[] = [];
    for (const x of known) {
      const goLeft = ref !== undefined ? parentCenter(x)! < ref : left.length <= right.length;
      if (goLeft) left.push(x);
      else right.push(x);
    }
    for (const x of unknown) {
      if (left.length <= right.length) left.unshift(x);
      else right.push(x);
    }
    // Rééquilibrage pour garder chaque conjoint au contact de la personne
    while (left.length > right.length + 1) right.unshift(left.pop()!);
    while (right.length > left.length + 1) left.push(right.shift()!);
    u.ids = [...left, hub, ...right];
  };
  // Les frères et sœurs restent groupés ; dans le groupe, ceux qui ont un conjoint d'une autre famille vont vers elle.
  const groupOf = (u: Unit) => {
    for (const id of u.ids) {
      const par = by.get(id)!.parent_ids.filter((r) => by.has(r));
      if (par.length) return [...par].sort().join("|");
    }
    return "solo:" + u.ids[0];
  };
  // Tassement : blocs fusionnés tant qu'ils se chevauchent (moindres carrés à ordre fixé)
  const pack = (row: Unit[], want: (number | undefined)[]) => {
    row.forEach(orderMembers);
    const items = row.map((u, i) => ({ u, d: (want[i] ?? u.x + u.w / 2) - u.w / 2, i, g: groupOf(u), gm: 0 }));
    const gsum = new Map<string, number[]>();
    items.forEach((it) => gsum.set(it.g, [...(gsum.get(it.g) ?? []), it.d + it.u.w / 2]));
    items.forEach((it) => (it.gm = mean(gsum.get(it.g)!)));
    items.sort((a, b) => a.gm - b.gm || (a.g < b.g ? -1 : a.g > b.g ? 1 : 0) || a.d + a.u.w / 2 - (b.d + b.u.w / 2) || a.i - b.i);
    type Block = { items: typeof items; offs: number[]; x: number; w: number };
    const blocks: Block[] = [];
    for (const it of items) {
      let b: Block = { items: [it], offs: [0], x: it.d, w: it.u.w };
      while (blocks.length) {
        const prev = blocks[blocks.length - 1];
        if (prev.x + prev.w + GU <= b.x) break;
        blocks.pop();
        const shift = prev.w + GU;
        const merged: Block = {
          items: [...prev.items, ...b.items],
          offs: [...prev.offs, ...b.offs.map((o) => o + shift)],
          x: 0,
          w: prev.w + GU + b.w,
        };
        merged.x = mean(merged.items.map((m, k) => m.d - merged.offs[k]));
        b = merged;
      }
      blocks.push(b);
    }
    const out: Unit[] = [];
    blocks.forEach((b) =>
      b.items.forEach((m, k) => {
        m.u.x = b.x + b.offs[k];
        out.push(m.u);
      }),
    );
    row.splice(0, row.length, ...out);
    commit(row);
  };

  for (let it = 0; it < 8; it++) {
    for (let r = 1; r < rows.length; r++)
      pack(
        rows[r],
        rows[r].map((u) => wantFrom(u, "down")),
      );
    for (let r = rows.length - 2; r >= 0; r--)
      pack(
        rows[r],
        rows[r].map((u) => wantFrom(u, "up")),
      );
  }
  for (let r = 1; r < rows.length; r++)
    pack(
      rows[r],
      rows[r].map((u) => wantFrom(u, "down")),
    );

  const pos = new Map<string, Pos>();
  rows.forEach((row, r) => row.forEach((u) => u.ids.forEach((id, i) => pos.set(id, { x: Math.round(u.x + i * (W + GX)), y: r * ROW }))));
  const xs = [...pos.values()].map((p) => p.x);
  const minX = xs.length ? Math.min(...xs) : 0;
  pos.forEach((p) => (p.x -= minX));
  const width = xs.length ? Math.max(...xs) - minX + W : 0;
  return { pos, families: familiesOf(people), width, height: rows.length ? (rows.length - 1) * ROW + H : 0 };
}

/* ---------- Liens de parenté ---------- */
export function relatives(people: Person[], p: Person) {
  const by = new Map(people.map((x) => [x.id, x]));
  const pick = (ids: string[]) => ids.map((i) => by.get(i)).filter((x): x is Person => !!x);
  const children = people.filter((c) => c.parent_ids.includes(p.id));
  const siblings =
    p.parent_ids.length && p.kind === "human"
      ? people.filter((s) => s.id !== p.id && s.kind === "human" && s.parent_ids.some((x) => p.parent_ids.includes(x)))
      : [];
  return {
    parents: pick(p.parent_ids),
    spouses: pick(p.spouse_ids),
    children: children.filter((c) => c.kind === "human"),
    pets: children.filter((c) => c.kind === "pet"),
    siblings,
  };
}

export function relation(people: Person[], rootId: string | null, p: Person): string {
  if (p.kind === "pet") return SPECIES[p.species || "autre"] ?? "Animal";
  if (!rootId) return "";
  if (p.id === rootId) return "Vous";
  const by = new Map(people.map((x) => [x.id, x]));
  const root = by.get(rootId);
  if (!root) return "";
  const g = (m: string, w: string) => (p.gender === "f" ? w : m);
  const anc = (id: string) => {
    const m = new Map([[id, 0]]);
    const q = [id];
    while (q.length) {
      const c = q.shift()!;
      for (const par of by.get(c)?.parent_ids ?? [])
        if (by.has(par) && !m.has(par)) {
          m.set(par, m.get(c)! + 1);
          q.push(par);
        }
    }
    return m;
  };
  const A = anc(rootId),
    B = anc(p.id);
  let best: [number, number] | null = null;
  for (const [id, da] of A) {
    const db = B.get(id);
    if (db !== undefined && (!best || da + db < best[0] + best[1])) best = [da, db];
  }
  const arr = (n: number, s: string) => (n > 0 ? "Arrière-".repeat(n) + s.charAt(0).toLowerCase() + s.slice(1) : s);
  if (best) {
    const [da, db] = best;
    if (db === 0) return da === 1 ? g("Père", "Mère") : arr(da - 2, g("Grand-père", "Grand-mère"));
    if (da === 0) return db === 1 ? g("Fils", "Fille") : arr(db - 2, g("Petit-fils", "Petite-fille"));
    if (da === 1 && db === 1) {
      const shared = p.parent_ids.filter((x) => root.parent_ids.includes(x)).length;
      const half = shared === 1 && p.parent_ids.length > 1 && root.parent_ids.length > 1;
      return half ? g("Demi-frère", "Demi-sœur") : g("Frère", "Sœur");
    }
    if (da === 2 && db === 1) return g("Oncle", "Tante");
    if (da === 3 && db === 1) return g("Grand-oncle", "Grand-tante");
    if (da === 1 && db === 2) return g("Neveu", "Nièce");
    if (da === 1 && db === 3) return g("Petit-neveu", "Petite-nièce");
    if (da === 2 && db === 2) return g("Cousin germain", "Cousine germaine");
    if (da === 3 && db === 3) return g("Cousin issu de germain", "Cousine issue de germain");
    if (da === 2 && db === 3) return g("Petit-cousin", "Petite-cousine");
    if (da >= 2 && db >= 2) return g("Cousin", "Cousine");
  }
  if (p.spouse_ids.includes(rootId)) return g("Conjoint", "Conjointe");
  if (root.spouse_ids.some((s) => by.get(s)?.parent_ids.includes(p.id))) return g("Beau-père", "Belle-mère");
  if (p.spouse_ids.some((s) => by.get(s)?.parent_ids.includes(rootId))) return g("Gendre", "Belle-fille");
  const sib = (a: Person, b: Person) => a.id !== b.id && a.parent_ids.some((x) => b.parent_ids.includes(x));
  if (
    root.spouse_ids.some((s) => {
      const sp = by.get(s);
      return !!sp && sib(sp, p);
    })
  )
    return g("Beau-frère", "Belle-sœur");
  if (
    p.spouse_ids.some((s) => {
      const sp = by.get(s);
      return !!sp && sib(sp, root);
    })
  )
    return g("Beau-frère", "Belle-sœur");
  const sp = p.spouse_ids.map((i) => by.get(i)).find(Boolean);
  return sp ? `${g("Conjoint", "Conjointe")} de ${sp.first_name}` : "";
}

/* ---------- Exports ---------- */
export function toGedcom(people: Person[]) {
  const idx = new Map(people.map((p, i) => [p.id, i + 1])),
    hum = people.filter((p) => p.kind === "human"),
    by = new Map(people.map((p) => [p.id, p]));
  const fams = new Map<string, { par: string[]; kids: string[] }>();
  const fam = (par: string[]) => {
    const k = [...par].sort().join("|");
    if (!fams.has(k)) fams.set(k, { par, kids: [] });
    return fams.get(k)!;
  };
  const line = (s: string) => s.replace(/[\r\n]+/g, " ");
  hum.forEach((p) => {
    const par = p.parent_ids.filter((i) => by.get(i)?.kind === "human");
    if (par.length) fam(par).kids.push(p.id);
    p.spouse_ids.forEach((s) => by.has(s) && fam([p.id, s]));
  });
  const famId = new Map([...fams.keys()].map((k, i) => [k, i + 1]));
  let o = "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n";
  hum.forEach((p) => {
    o += `0 @I${idx.get(p.id)}@ INDI\n1 NAME ${line(p.first_name)} /${line(p.last_name)}/\n1 SEX ${p.gender === "m" ? "M" : p.gender === "f" ? "F" : "U"}\n`;
    if (p.birth || p.birth_place)
      o += "1 BIRT\n" + (p.birth ? `2 DATE ${gedDate(line(p.birth))}\n` : "") + (p.birth_place ? `2 PLAC ${line(p.birth_place)}\n` : "");
    if (p.death) o += `1 DEAT\n2 DATE ${gedDate(line(p.death))}\n`;
    if (p.job) o += `1 OCCU ${line(p.job)}\n`;
    fams.forEach((f, k) => {
      if (f.kids.includes(p.id)) o += `1 FAMC @F${famId.get(k)}@\n`;
      if (f.par.includes(p.id)) o += `1 FAMS @F${famId.get(k)}@\n`;
    });
  });
  fams.forEach((f, k) => {
    const h = f.par.find((i) => by.get(i)?.gender === "m") ?? f.par[0],
      w = f.par.find((i) => i !== h);
    o +=
      `0 @F${famId.get(k)}@ FAM\n` +
      (h ? `1 HUSB @I${idx.get(h)}@\n` : "") +
      (w ? `1 WIFE @I${idx.get(w)}@\n` : "") +
      f.kids.map((c) => `1 CHIL @I${idx.get(c)}@\n`).join("");
  });
  return o + "0 TRLR\n";
}

export type Upcoming = { kind: "naissance" | "union"; label: string; d: Date; n: number; id?: string };
export function upcoming(people: Person[], unions: Union[]) {
  const now = new Date(),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: Upcoming[] = [];
  const add = (kind: Upcoming["kind"], label: string, s: string | null | undefined, id?: string) => {
    const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return;
    let d = new Date(today.getFullYear(), +m[2] - 1, +m[1]);
    if (d < today) d = new Date(today.getFullYear() + 1, +m[2] - 1, +m[1]);
    out.push({ kind, label, d, n: d.getFullYear() - +m[3], id });
  };
  people.forEach((p) => p.kind === "human" && !p.death && add("naissance", fullName(p), p.birth, p.id));
  unions.forEach((u) => {
    const a = people.find((p) => p.id === u.person_a),
      b = people.find((p) => p.id === u.person_b);
    if (a && b && ["mariage", "mariage-religieux", "pacs"].includes(u.type)) add("union", `${a.first_name} et ${b.first_name}`, u.date);
  });
  return out.sort((x, y) => +x.d - +y.d).slice(0, 15);
}

export const uid = () => crypto.randomUUID();
export const split = (s: string, def = "") => {
  const [f = "", ...r] = s.trim().split(/\s+/);
  return { first_name: f, last_name: r.join(" ") || def };
};
export const download = (href: string, name: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
};
export const compress = (f: File) =>
  new Promise<Blob>((res, rej) => {
    if (!f.type.startsWith("image/") || f.size > 20 * 1024 * 1024) return rej(new Error("type"));
    const img = new Image(),
      url = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/webp", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("lecture"));
    };
    img.src = url;
  });
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
