import { type Person, gens } from "./lib";
import { reliefPaths } from "./themes";

/* Ce que l'on exporte : profondeur (0 = arbre complet) et sens de lecture. */
export type Depth = 0 | 3 | 4;
export type View = "all" | "up" | "down";
export type Format = "png" | "jpg" | "svg" | "a2" | "a1";
export type ExportOpts = { depth: Depth; view: View; format: Format; scene: boolean };

const kidsOf = (people: Person[]) => {
  const m = new Map<string, string[]>();
  people.forEach((c) => c.parent_ids.forEach((pid) => m.set(pid, [...(m.get(pid) ?? []), c.id])));
  return m;
};

/* Garde les personnes demandées, puis retire les liens vers celles qui sortent du cadre. */
export function scopePeople(people: Person[], rootId: string | null, depth: Depth, view: View): Person[] {
  if (!people.length || (view === "all" && !depth)) return people;
  const by = new Map(people.map((p) => [p.id, p]));
  const root = rootId && by.has(rootId) ? rootId : people[0].id;
  const max = depth ? depth - 1 : Infinity;
  const keep = new Set<string>([root]);

  if (view === "up") {
    let front = [root];
    for (let lv = 1; lv <= max && front.length; lv++) {
      front = front.flatMap((id) => by.get(id)!.parent_ids.filter((x) => by.has(x) && !keep.has(x)));
      front.forEach((x) => keep.add(x));
    }
  } else if (view === "down") {
    const kids = kidsOf(people);
    let front = [root];
    for (let lv = 1; lv <= max && front.length; lv++) {
      front = front.flatMap((id) => (kids.get(id) ?? []).filter((x) => !keep.has(x)));
      front.forEach((x) => keep.add(x));
    }
    // Les conjoints restent à côté de leurs enfants.
    for (const id of [...keep]) by.get(id)!.spouse_ids.forEach((s) => by.has(s) && keep.add(s));
  } else {
    // Vue globale limitée : la famille reliée à la racine, à N générations au plus.
    const g = gens(people, root);
    const kids = kidsOf(people);
    const seen = new Set([root]);
    const q = [root];
    while (q.length) {
      const p = by.get(q.shift()!)!;
      for (const x of [...p.parent_ids, ...p.spouse_ids, ...(kids.get(p.id) ?? [])])
        if (by.has(x) && !seen.has(x)) {
          seen.add(x);
          q.push(x);
        }
    }
    for (const id of seen) if (Math.abs(g.get(id) ?? 0) <= max) keep.add(id);
  }

  return people
    .filter((p) => keep.has(p.id))
    .map((p) => ({ ...p, parent_ids: p.parent_ids.filter((x) => keep.has(x)), spouse_ids: p.spouse_ids.filter((x) => keep.has(x)) }));
}

/* Couleurs du paysage lues dans les jetons de l'ambiance, converties en rgb pour
   que le fichier s'affiche partout (certains logiciels ignorent oklch). */
function rgb(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}
export function sceneColors() {
  const s = getComputedStyle(document.documentElement);
  const v = (k: string) => rgb(s.getPropertyValue(k).trim() || "#ccc");
  return {
    sky1: v("--sky-1"),
    sky2: v("--sky-2"),
    astre: v("--astre"),
    hills: [v("--hill-1"), v("--hill-2"), v("--hill-3")],
    paper: v("--paper"),
    ink: v("--ink"),
  };
}

// Mêmes proportions qu'à l'écran : les collines occupent le bas, à l'échelle de la largeur.
const HILLS = [0.46, 0.36, 0.24];
const band = (w: number, h: number) => Math.min(h, w * 0.5);

export function paintScene(ctx: CanvasRenderingContext2D, w: number, h: number, ambiance: string) {
  const c = sceneColors();
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, c.sky1);
  sky.addColorStop(0.7, c.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.12;
  const sun = ctx.createRadialGradient(w * 0.86 - r, h * 0.08 + r, 0, w * 0.86 - r, h * 0.08 + r, r);
  sun.addColorStop(0, c.astre);
  sun.addColorStop(0.5, c.astre);
  sun.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  const b = band(w, h);
  reliefPaths(ambiance).forEach((d, i) => {
    const lh = b * HILLS[i];
    ctx.save();
    ctx.translate(-0.05 * w, h - lh);
    ctx.scale((w * 1.1) / 1600, lh / 400);
    ctx.fillStyle = c.hills[i];
    ctx.fill(new Path2D(d));
    ctx.restore();
  });
}

export function sceneSvg(w: number, h: number, ambiance: string) {
  const c = sceneColors();
  const b = band(w, h);
  const r = Math.min(w, h) * 0.12;
  const hills = reliefPaths(ambiance)
    .map((d, i) => {
      const lh = b * HILLS[i];
      return `<path fill="${c.hills[i]}" transform="translate(${-0.05 * w},${h - lh}) scale(${(w * 1.1) / 1600},${lh / 400})" d="${d}"/>`;
    })
    .join("");
  return (
    `<defs><linearGradient id="mag-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky1}"/><stop offset="0.7" stop-color="${c.sky2}"/></linearGradient>` +
    `<radialGradient id="mag-astre"><stop offset="0.5" stop-color="${c.astre}"/><stop offset="1" stop-color="${c.astre}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#mag-ciel)"/><circle cx="${w * 0.86 - r}" cy="${h * 0.08 + r}" r="${r}" fill="url(#mag-astre)"/>${hills}`
  );
}

export const FORMAT_LABEL: Record<Format, string> = {
  png: "Image PNG haute définition",
  jpg: "Image JPG (plus légère)",
  svg: "SVG (pour l'imprimeur)",
  a2: "PDF grand format A2",
  a1: "PDF très grand format A1",
};
export const fileName = (title: string, f: Format) =>
  (title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "mon-arbre") + (f === "a1" || f === "a2" ? `-${f}.pdf` : `.${f}`);
