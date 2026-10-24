import { type Person, type Union, fullName } from "./lib";

/* Vérificateur de cohérence : il signale, il ne corrige rien. Les messages restent
   bienveillants, car une date « bizarre » est souvent une vraie histoire de famille. */
export type Alert = { id: string; text: string };

// Date approximative en années décimales : « 12/03/1950 » → 1950.19, « vers 1900 » → 1900.
const when = (d: string | null): number | null => {
  if (!d) return null;
  const m = d.match(/(?:(\d{1,2})\/)?(?:(\d{1,2})\/)?(\d{4})\s*$/);
  if (!m) return null;
  const y = +m[3];
  if (m[1] && m[2]) return y + (+m[2] - 1) / 12 + (+m[1] - 1) / 365;
  if (m[1]) return y + (+m[1] - 1) / 12;
  return y;
};
const exact = (d: string | null) => !!d && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d.trim());

export function checkFamily(people: Person[], unions: Union[], today = new Date()): Alert[] {
  const out: Alert[] = [];
  const by = new Map(people.map((p) => [p.id, p]));
  const nowY = today.getFullYear() + today.getMonth() / 12;

  for (const p of people) {
    if (p.kind !== "human") continue;
    const b = when(p.birth),
      d = when(p.death);
    const name = fullName(p);
    // Avec des années seules, une même année n'est pas une erreur.
    if (b !== null && d !== null && (exact(p.birth) && exact(p.death) ? d < b : Math.floor(d) < Math.floor(b)))
      out.push({ id: p.id, text: `${name} : la date de décès précède la date de naissance.` });
    if (b !== null && !p.death && nowY - b > 110)
      out.push({ id: p.id, text: `${name} aurait plus de 110 ans. Une date de décès manque peut-être.` });
    if (b === null) continue;
    for (const pid of p.parent_ids) {
      const m = by.get(pid);
      if (!m || m.gender !== "f") continue;
      const md = when(m.death),
        mb = when(m.birth);
      if (md !== null && Math.floor(b) > Math.floor(md))
        out.push({ id: p.id, text: `${name} est né${p.gender === "f" ? "e" : ""} après le décès de sa mère, ${fullName(m)}.` });
      if (mb !== null && b - mb < 13) out.push({ id: p.id, text: `${fullName(m)} aurait eu moins de 13 ans à la naissance de ${name}.` });
    }
  }

  for (const u of unions) {
    const at = when(u.date);
    if (at === null || !["mariage", "mariage-religieux", "pacs"].includes(u.type)) continue;
    for (const id of [u.person_a, u.person_b]) {
      const p = by.get(id);
      if (!p) continue;
      const b = when(p.birth),
        d = when(p.death);
      if (b !== null && at - b < 15) out.push({ id, text: `${fullName(p)} aurait eu moins de 15 ans au moment de l'union.` });
      if (d !== null && Math.floor(at) > Math.floor(d)) out.push({ id, text: `L'union de ${fullName(p)} est datée après son décès.` });
    }
  }
  return out;
}
