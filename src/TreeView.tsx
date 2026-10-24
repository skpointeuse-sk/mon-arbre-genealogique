import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as RKE } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  type NewPerson,
  type Person,
  type Tree,
  H,
  ROW,
  W,
  compress,
  download,
  fullName,
  layout,
  lifespan,
  norm,
  relation,
  split,
  toGedcom,
  uid,
} from "./lib";
import { AMBIANCES, ambianceOf } from "./themes";
import { Scene } from "./scenes";
import { PersonCard } from "./card";
import { PersonPanel, type AddRel } from "./Panel";
import { AddDialog, CalendarDialog, CheckDialog, ExportDialog, ShareDialog, UnionDialog } from "./dialogs";
import { type ExportOpts, fileName, paintScene, sceneColors, sceneSvg, scopePeople } from "./exporting";
import { parseGedcom } from "./gedcom";
import { Icon, Mark } from "./icons";
import { frError, useUi } from "./ui";
import { useTreeData } from "./useTreeData";
import { KMIN, useView } from "./useView";
import { initials, usePresence } from "./usePresence";
import { type Plan, type Snapshot, type Step, plan } from "./undo";
import { HistoryDialog } from "./history";

const PANEL_W = 400;
const isWide = () => window.innerWidth >= 900;

export function TreeView({ tree, session }: { tree: Tree; session: Session | null }) {
  const { say, ask } = useUi();
  const [t, setT] = useState(tree);
  const { people: all, unions, urls, loaded, loadError, load } = useTreeData(tree.id);
  const [scope, setScope] = useState<ExportOpts | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [add, setAdd] = useState<{ rel: AddRel; of: Person } | null>(null);
  const [share, setShare] = useState(false);
  const [cal, setCal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [files, setFiles] = useState(false);
  const [un, setUn] = useState<{ a: string; b: string } | null>(null);
  const [check, setCheck] = useState(false);
  const gedInput = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  const hist = useRef<{ u: Step[]; r: Step[] }>({ u: [], r: [] });
  const { v, setV, vRef, anim, animate, zoomAt, pan, gesture, handlers } = useView(box);

  useEffect(() => {
    if (session)
      supabase
        .from("tree_members")
        .select("role")
        .eq("tree_id", tree.id)
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => setRole(data?.role ?? null));
  }, [tree.id, session]);

  const canEdit = (!!role && role !== "viewer") || (!!session && t.link_access === "edit");
  const canAdmin = role === "owner" || role === "co_lead";
  const others = usePresence(tree.id, role ? session : null);
  const rootId = t.root_id && all.some((p) => p.id === t.root_id) ? t.root_id : (all[0]?.id ?? null);
  // Pendant un export, seules les personnes choisies sont dessinées.
  const people = useMemo(() => (scope ? scopePeople(all, rootId, scope.depth, scope.view) : all), [all, rootId, scope]);
  const L = useMemo(() => layout(people, rootId), [people, rootId]);
  const rels = useMemo(() => new Map(people.map((p) => [p.id, relation(people, rootId, p)])), [people, rootId]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selected = sel ? (byId.get(sel) ?? null) : null;
  const ambiance = ambianceOf(t.settings?.preset);
  useEffect(() => {
    document.documentElement.dataset.ambiance = ambiance;
    return () => {
      delete document.documentElement.dataset.ambiance;
    };
  }, [ambiance]);

  // Proches de la personne choisie : mis en avant, le reste s'estompe.
  const near = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected.id, ...selected.parent_ids, ...selected.spouse_ids]);
    people.forEach((c) => c.parent_ids.includes(selected.id) && s.add(c.id));
    return s;
  }, [selected, people]);

  /* ---------- Vue : recentrage ---------- */
  const area = () => {
    const b = box.current!;
    const panel = !!sel;
    const w = b.clientWidth - (panel && isWide() ? PANEL_W : 0);
    const h = panel && !isWide() ? b.clientHeight * 0.42 : b.clientHeight;
    return { w, h };
  };
  const center = (id: string | null, k = vRef.current.k, withPanel = !!sel) => {
    const c = id ? L.pos.get(id) : undefined,
      b = box.current;
    if (!c || !b) return;
    const w = b.clientWidth - (withPanel && isWide() ? PANEL_W : 0);
    const h = withPanel && !isWide() ? b.clientHeight * 0.42 : b.clientHeight;
    animate({ k, x: w / 2 - (c.x + W / 2) * k, y: h / 2 - (c.y + H / 2) * k });
  };
  const fit = () => {
    if (!box.current || !L.width) return;
    const { w, h } = area();
    const k = Math.max(KMIN, Math.min(1, (w - 48) / L.width, (h - 96) / (L.height + 40)));
    animate({ k, x: (w - L.width * k) / 2, y: (h - L.height * k) / 2 + 10 });
  };

  // Premier affichage : la racine au centre de l'écran.
  const centerFirst = useEffectEvent(() => {
    if (!people.length || centered.current || !box.current) return;
    centered.current = true;
    const k = isWide() ? 0.9 : 0.62;
    const c = rootId ? L.pos.get(rootId) : undefined;
    const b = box.current;
    if (c) setV({ k, x: b.clientWidth / 2 - (c.x + W / 2) * k, y: b.clientHeight / 2 - (c.y + H / 2) * k });
  });
  useEffect(() => centerFirst(), [people.length]);

  const onKey = (e: RKE) => {
    if (e.target !== box.current) return;
    const step = 80;
    const map: Record<string, () => void> = {
      ArrowLeft: () => pan(step, 0),
      ArrowRight: () => pan(-step, 0),
      ArrowUp: () => pan(0, step),
      ArrowDown: () => pan(0, -step),
      "+": () => zoomAt(1.25, undefined, undefined, true),
      "=": () => zoomAt(1.25, undefined, undefined, true),
      "-": () => zoomAt(0.8, undefined, undefined, true),
      "0": fit,
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    }
  };

  const select = (id: string | null, recenter = true) => {
    setSel(id);
    if (id && recenter) center(id, Math.max(vRef.current.k, 0.7), true);
  };
  const go = (id: string) => select(id, true);

  /* ---------- Écritures ---------- */
  const patch = (id: string, d: Record<string, unknown>) => supabase.from("people").update(d).eq("id", id);
  const now = (): Snapshot => ({ people: all, unions });
  // Avant chaque action : on garde l'état. Après : reload() note l'état obtenu (voir undo.ts).
  const snap = () => {
    const u = hist.current.u.filter((s) => s.after !== null);
    hist.current = { u: [...u.slice(-29), { before: now(), after: null }], r: [] };
  };
  const reload = async () => {
    const s = await load();
    const last = hist.current.u.at(-1);
    if (s && last && last.after === null) last.after = s;
    return s;
  };
  const apply = async (p: Plan) => {
    for (const u of p.deleteUnions)
      await supabase.from("unions").delete().eq("tree_id", t.id).eq("person_a", u.person_a).eq("person_b", u.person_b);
    if (p.upsertPeople.length) await supabase.from("people").upsert(p.upsertPeople);
    if (p.deletePeople.length) await supabase.from("people").delete().in("id", p.deletePeople);
    if (p.upsertUnions.length) await supabase.from("unions").upsert(p.upsertUnions);
    await load();
  };
  const conflictNote = (c: string[]) =>
    c.length ? ` Modifié entre-temps par quelqu'un d'autre, donc laissé tel quel : ${c.join(", ")}.` : "";
  const undo = async () => {
    const step = hist.current.u.pop();
    if (!step) return say("Rien à annuler.");
    const cur = (await load()) ?? now();
    const p = plan(step.after ?? cur, step.before, cur);
    await apply(p);
    hist.current.r.push({ before: step.before, after: step.after ?? cur });
    say("Modification annulée." + conflictNote(p.conflicts));
  };
  const redo = async () => {
    const step = hist.current.r.pop();
    if (!step) return say("Rien à rétablir.");
    const cur = (await load()) ?? now();
    const p = plan(step.before, step.after!, cur);
    await apply(p);
    hist.current.u.push(step);
    say("Modification rétablie." + conflictNote(p.conflicts));
  };
  const onShortcut = useEffectEvent((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (!canEdit || !(e.ctrlKey || e.metaKey) || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  });
  useEffect(() => {
    const k = (e: KeyboardEvent) => onShortcut(e);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const onPhoto = async (p: Person, f: File) => {
    try {
      const path = `${t.id}/${p.id}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("tree-media").upload(path, await compress(f), { contentType: "image/webp" });
      if (error) return say(frError(error.message), "error");
      snap();
      await patch(p.id, { photo_path: path });
      reload();
      say("Photo enregistrée.");
    } catch {
      say("Cette image ne peut pas être lue. Utilisez une photo JPEG, PNG ou WebP de moins de 20 Mo.", "error");
    }
  };
  const saveUnion = async (d: { type: string; date: string; place: string; notes: string }) => {
    if (!un) return false;
    snap();
    const { error } = await supabase.from("unions").upsert({
      tree_id: t.id,
      person_a: un.a,
      person_b: un.b,
      type: d.type,
      date: d.date.trim() || null,
      place: d.place.trim() || null,
      notes: d.notes.trim() || null,
    });
    if (error) {
      say(frError(error.message), "error");
      return false;
    }
    say("Union enregistrée.");
    reload();
    return true;
  };
  const submitAdd = async (name: string, species: string) => {
    if (!add) return;
    const { rel, of } = add;
    if (rel === "sibling" && !of.parent_ids.length) {
      say("Ajoutez d'abord un père ou une mère à cette personne.", "error");
      return;
    }
    snap();
    const row: NewPerson = {
      id: uid(),
      tree_id: t.id,
      kind: "human",
      gender: "u",
      origins: [],
      parent_ids: [],
      spouse_ids: [],
      ...split(name, rel === "child" || rel === "sibling" || rel === "father" ? of.last_name : ""),
    };
    const ins = async () => {
      const { error } = await supabase.from("people").insert(row);
      if (error) {
        say(frError(error.message), "error");
        return false;
      }
      return true;
    };
    if (rel === "father" || rel === "mother") {
      row.gender = rel === "father" ? "m" : "f";
      const other = people.find((p) => of.parent_ids.includes(p.id));
      if (other) row.spouse_ids = [other.id];
      if (!(await ins())) return;
      await patch(of.id, { parent_ids: [...of.parent_ids, row.id] });
      if (other) await patch(other.id, { spouse_ids: [...other.spouse_ids, row.id] });
    } else if (rel === "spouse") {
      row.spouse_ids = [of.id];
      if (!(await ins())) return;
      await patch(of.id, { spouse_ids: [...of.spouse_ids, row.id] });
    } else if (rel === "sibling") {
      row.parent_ids = of.parent_ids;
      if (!(await ins())) return;
    } else if (rel === "child") {
      row.parent_ids = [of.id, ...of.spouse_ids.slice(0, 1)];
      if (!(await ins())) return;
    } else {
      row.kind = "pet";
      row.species = species;
      row.parent_ids = [of.id];
      if (!(await ins())) return;
    }
    setAdd(null);
    await reload();
    say(`${row.first_name} a été ajouté${row.gender === "f" ? "e" : ""} à l'arbre.`);
  };
  const remove = async (p: Person) => {
    if (
      !(await ask(
        `Supprimer ${fullName(p)} de l'arbre ? Ses liens avec les autres personnes seront retirés. Vous pourrez annuler juste après avec « Annuler ».`,
        "Supprimer",
      ))
    )
      return;
    snap();
    for (const o of people) {
      if (o.parent_ids.includes(p.id)) await patch(o.id, { parent_ids: o.parent_ids.filter((x) => x !== p.id) });
      if (o.spouse_ids.includes(p.id)) await patch(o.id, { spouse_ids: o.spouse_ids.filter((x) => x !== p.id) });
    }
    const { error } = await supabase.from("people").delete().eq("id", p.id);
    if (error) say(frError(error.message), "error");
    else say(`${fullName(p)} a été retiré de l'arbre.`);
    setSel(null);
    reload();
  };
  const upTree = async (d: Record<string, unknown>) => {
    const { error } = await supabase.from("trees").update(d).eq("id", t.id);
    if (error) return say(frError(error.message), "error");
    setT((o) => ({ ...o, ...d }) as Tree);
  };
  const invite = async (email: string, r: string) => {
    const { error } = await supabase
      .from("tree_invites")
      .insert({ tree_id: t.id, email: email.trim().toLowerCase(), role: r, invited_by: session!.user.id });
    if (error) {
      say(frError(error.message), "error");
      return false;
    }
    say("Invitation enregistrée : la personne verra l'arbre en se connectant avec cet email.");
    return true;
  };

  const runExport = async (o: ExportOpts) => {
    const prevSel = sel;
    setSel(null);
    setScope(o);
    await new Promise((r) => setTimeout(r, 150));
    try {
      const Ls = layout(scopePeople(all, rootId, o.depth, o.view), rootId);
      const w = Ls.width + 80,
        h = Ls.height + 150;
      const big = o.format === "a1" || o.format === "a2";
      const pr = Math.max(1, Math.min(big ? 4 : 3, (big ? 5000 : 8000) / Math.max(w, h)));
      const opts = { width: w, height: h, style: { transform: "translate(40px,100px)", transition: "none" } };
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--ink").trim() || "#1d2a22";
      const serif = css.getPropertyValue("--serif").trim() || "Georgia, serif";
      // html-to-image perd le style CSS des traits SVG : on le fige le temps de la capture.
      inner.current!.querySelectorAll<SVGElement>(".links path, .links line").forEach((el) => {
        const c = getComputedStyle(el);
        Object.assign(el.style, { stroke: c.stroke, strokeWidth: c.strokeWidth, fill: c.fill, opacity: c.opacity });
      });
      const lib = await import("html-to-image");
      const name = fileName(t.title, o.format);
      if (o.format === "svg") {
        const url = await lib.toSvg(inner.current!, opts);
        const raw = decodeURIComponent(url.slice(url.indexOf(",") + 1));
        const esc = t.title.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
        const bg = o.scene ? sceneSvg(w, h, ambiance) : `<rect width="${w}" height="${h}" fill="${sceneColors().paper}"/>`;
        const head = `<text x="40" y="62" font-family="Georgia, serif" font-size="30" font-weight="600" fill="${sceneColors().ink}">${esc}</text>`;
        const svg = raw.replace(/<svg[^>]*>/, (m) => m + bg + head);
        download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), name);
      } else {
        const tree = await lib.toCanvas(inner.current!, { ...opts, pixelRatio: pr });
        const c = document.createElement("canvas");
        c.width = tree.width;
        c.height = tree.height;
        const ctx = c.getContext("2d")!;
        ctx.scale(tree.width / w, tree.height / h);
        if (o.scene) paintScene(ctx, w, h, ambiance);
        else {
          ctx.fillStyle = sceneColors().paper;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.fillStyle = ink;
        ctx.font = `600 30px ${serif}`;
        ctx.fillText(t.title, 40, 62);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(tree, 0, 0);
        if (!big) {
          const blob = await new Promise<Blob | null>((r) => c.toBlob(r, o.format === "jpg" ? "image/jpeg" : "image/png", 0.92));
          if (!blob) throw new Error("canvas");
          download(URL.createObjectURL(blob), name);
        } else {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "mm", format: o.format });
          const pw = pdf.internal.pageSize.getWidth(),
            ph = pdf.internal.pageSize.getHeight(),
            m = 12;
          const k = Math.min((pw - 2 * m) / w, (ph - 2 * m) / h);
          pdf.setProperties({ title: t.title, creator: "Mon Arbre Généalogique" });
          pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", (pw - w * k) / 2, (ph - h * k) / 2, w * k, h * k);
          pdf.save(name);
        }
      }
      setExportOpen(false);
      say("Le fichier est prêt, il se trouve dans vos téléchargements.");
    } catch {
      say("L'export n'a pas pu être créé. Réessayez avec moins de générations, ou exportez en GEDCOM.", "error");
    }
    inner.current?.querySelectorAll(".links path, .links line").forEach((el) => el.removeAttribute("style"));
    setScope(null);
    setSel(prevSel);
  };
  const exportGed = () => {
    setMenu(false);
    download(URL.createObjectURL(new Blob([toGedcom(people)], { type: "text/plain" })), "mon-arbre.ged");
  };
  // Import : les personnes du fichier s'ajoutent à l'arbre, rien n'est remplacé ni supprimé.
  const importGed = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return say("Ce fichier dépasse 5 Mo. Exportez une partie de l'arbre depuis votre logiciel.", "error");
    const { people: rows, skipped } = parseGedcom(await file.text(), t.id);
    if (!rows.length)
      return say("Aucune personne trouvée dans ce fichier. Vérifiez qu'il s'agit bien d'un fichier GEDCOM (.ged).", "error");
    const ok = await ask(
      `Ajouter ${rows.length} personne${rows.length > 1 ? "s" : ""} de « ${file.name} » à l'arbre ? Les fiches existantes ne sont pas modifiées.`,
      "Importer",
    );
    if (!ok) return;
    snap();
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("people").insert(rows.slice(i, i + 200));
      if (error) {
        say(frError(error.message), "error");
        break;
      }
    }
    await reload();
    say(
      `${rows.length} personne${rows.length > 1 ? "s ajoutées" : " ajoutée"}.${skipped ? ` ${skipped} fiche${skipped > 1 ? "s" : ""} sans nom ignorée${skipped > 1 ? "s" : ""}.` : ""}`,
    );
  };

  /* ---------- Recherche ---------- */
  const [q, setQ] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [qi, setQi] = useState(0);
  const [searchMobile, setSearchMobile] = useState(false);
  const matches = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    return people.filter((p) => norm(`${p.first_name} ${p.last_name} ${p.last_name} ${p.first_name}`).includes(n)).slice(0, 8);
  }, [q, people]);
  const pick = (p: Person) => {
    setQ("");
    setQOpen(false);
    setSearchMobile(false);
    go(p.id);
  };

  /* ---------- Rendu ---------- */
  const lines = useMemo(() => {
    const out: { d: string; key: string; ids: string[] }[] = [];
    const rowFam = new Map<number, number>();
    for (const f of L.families) {
      const ps = f.parents.map((i) => ({ id: i, ...L.pos.get(i)! })).filter((x) => x.x !== undefined);
      const cs = f.children.map((i) => ({ id: i, ...L.pos.get(i)! })).filter((x) => x.x !== undefined);
      if (!ps.length || !cs.length) continue;
      let ox: number, oy: number;
      const [a, b] = ps;
      if (ps.length >= 2 && a.y === b.y) {
        const [l, r] = a.x < b.x ? [a, b] : [b, a];
        const adjacent = r.x - l.x - W <= 40;
        ox = adjacent ? (l.x + W + r.x) / 2 : (l.x + r.x + W) / 2;
        oy = adjacent ? l.y + H / 2 : l.y + H;
      } else {
        const low = ps.reduce((m, p) => (p.y > m.y ? p : m));
        ox = low.x + W / 2;
        oy = low.y + H;
      }
      const top = Math.min(...cs.map((c) => c.y));
      const n = rowFam.get(top) ?? 0;
      rowFam.set(top, n + 1);
      const bus = top - (ROW - H) / 2 + ((n % 3) - 1) * 8;
      const xs = [ox, ...cs.map((c) => c.x + W / 2)];
      let d = `M${ox},${oy} V${bus} M${Math.min(...xs)},${bus} H${Math.max(...xs)}`;
      for (const c of cs) d += ` M${c.x + W / 2},${bus} V${c.y}`;
      out.push({ d, key: f.key, ids: [...f.parents, ...f.children] });
    }
    return out;
  }, [L]);
  const couples = useMemo(() => {
    const out: { a: Person; b: Person; x1: number; x2: number; y: number; arc: boolean }[] = [];
    for (const p of people)
      for (const s of p.spouse_ids) {
        if (p.id >= s) continue;
        const q = byId.get(s),
          A = L.pos.get(p.id),
          B = L.pos.get(s);
        if (!q || !A || !B) continue;
        const [l, r] = A.x < B.x ? [A, B] : [B, A];
        out.push({ a: p, b: q, x1: l.x + W, x2: r.x, y: l.y + H / 2, arc: A.y !== B.y || r.x - l.x - W > 40 });
      }
    return out;
  }, [people, L, byId]);
  const unionOf = (a: string, b: string) =>
    unions.find((u) => (u.person_a === a && u.person_b === b) || (u.person_a === b && u.person_b === a));

  const fileTools = (
    <>
      <button
        className="tool"
        onClick={() => {
          setMenu(false);
          setExportOpen(true);
        }}
      >
        <Icon name="download" />
        <span>Image ou PDF</span>
      </button>
      <button className="tool" onClick={exportGed}>
        <Icon name="download" />
        <span>Fichier GEDCOM</span>
      </button>
      {canEdit && (
        <button
          className="tool"
          onClick={() => {
            setMenu(false);
            gedInput.current?.click();
          }}
        >
          <Icon name="upload" />
          <span>Importer un GEDCOM</span>
        </button>
      )}
    </>
  );

  // Dans la barre du haut, les fichiers passent dans un menu et Annuler/Rétablir en icônes : tout tient en 1280 px.
  const tools = (sheet: boolean) => (
    <>
      {canEdit && (
        <div className="tool-group">
          <button className="tool" onClick={undo} title="Annuler (Ctrl+Z)">
            <Icon name="undo" />
            <span className={sheet ? undefined : "sr"}>Annuler</span>
          </button>
          <button className="tool" onClick={redo} title="Rétablir (Ctrl+Y)">
            <Icon name="redo" />
            <span className={sheet ? undefined : "sr"}>Rétablir</span>
          </button>
        </div>
      )}
      <button
        title="Anniversaires"
        className="tool"
        onClick={() => {
          setMenu(false);
          setCal(true);
        }}
      >
        <Icon name="calendar" />
        <span>Anniversaires</span>
      </button>
      {sheet ? (
        fileTools
      ) : (
        <div
          className="tool-menu"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFiles(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setFiles(false);
          }}
        >
          <button title="Fichier" className="tool" aria-expanded={files} aria-controls="file-tools" onClick={() => setFiles((f) => !f)}>
            <Icon name="download" />
            <span>Fichier</span>
          </button>
          {files && (
            <div id="file-tools" className="tool-pop" onClick={() => setFiles(false)}>
              {fileTools}
            </div>
          )}
        </div>
      )}
      <button
        title="Vérifier"
        className="tool"
        onClick={() => {
          setMenu(false);
          setCheck(true);
        }}
      >
        <Icon name="check" />
        <span>Vérifier</span>
      </button>
      {role && (
        <button
          title="Historique"
          className="tool"
          onClick={() => {
            setMenu(false);
            setHistory(true);
          }}
        >
          <Icon name="history" />
          <span>Historique</span>
        </button>
      )}
      {canAdmin && (
        <label className="tool tool-select">
          <Icon name="layers" />
          <span className="sr">Ambiance</span>
          <select value={ambiance} onChange={(e) => upTree({ settings: { ...(t.settings ?? {}), preset: e.target.value } })}>
            {Object.entries(AMBIANCES).map(([k, x]) => (
              <option key={k} value={k}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {canAdmin && (
        <button
          title="Partager"
          className="tool"
          onClick={() => {
            setMenu(false);
            setShare(true);
          }}
        >
          <Icon name="share" />
          <span>Partager</span>
        </button>
      )}
      {session ? (
        <button title="Se déconnecter" className="tool" onClick={() => supabase.auth.signOut()}>
          <Icon name="logout" />
          <span>Se déconnecter</span>
        </button>
      ) : (
        <a title="Se connecter" className="tool" href="/">
          <Icon name="logout" />
          <span>Se connecter</span>
        </a>
      )}
    </>
  );

  const search = (
    <div className="search" role="combobox" aria-expanded={qOpen && matches.length > 0} aria-haspopup="listbox">
      <Icon name="search" size={18} />
      <input
        type="search"
        placeholder="Rechercher une personne"
        aria-label="Rechercher une personne"
        value={q}
        autoFocus={searchMobile}
        onChange={(e) => {
          setQ(e.target.value);
          setQOpen(true);
          setQi(0);
        }}
        onFocus={() => setQOpen(true)}
        onBlur={() => setTimeout(() => setQOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setQi((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setQi((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (matches[qi]) pick(matches[qi]);
          } else if (e.key === "Escape") {
            setQ("");
            setSearchMobile(false);
          }
        }}
        aria-activedescendant={qOpen && q.trim() && matches[qi] ? "opt-" + matches[qi].id : undefined}
        aria-controls={qOpen && q.trim() ? "search-list" : undefined}
      />
      {qOpen && q.trim() && (
        <ul id="search-list" role="listbox" className="search-list">
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={"opt-" + p.id}
              role="option"
              aria-selected={i === qi}
              className={i === qi ? "on" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
            >
              <span className="kin-name">{fullName(p)}</span>
              <span className="kin-meta">{[rels.get(p.id), lifespan(p)].filter(Boolean).join(", ")}</span>
            </li>
          ))}
          {!matches.length && <li className="empty">Personne ne porte ce nom dans l'arbre.</li>}
        </ul>
      )}
    </div>
  );

  return (
    <div className="app" data-ambiance={ambiance}>
      <header className="topbar">
        <div className="topbar-id">
          <Mark size={26} />
          <div>
            <p className="topbar-app">Mon Arbre Généalogique</p>
            <h1 className="topbar-title">{t.title}</h1>
          </div>
        </div>
        <div className="topbar-search">{search}</div>
        {others.length > 0 && (
          <div className="presence" role="status" aria-label={`En ce moment sur l'arbre : ${others.map((o) => o.name).join(", ")}`}>
            {others.slice(0, 4).map((o) => (
              <span key={o.id} title={o.name} aria-hidden="true">
                {initials(o.name)}
              </span>
            ))}
          </div>
        )}
        <nav className="topbar-tools" aria-label="Outils">
          {tools(false)}
        </nav>
        <div className="topbar-mobile">
          <button className="icon-btn" aria-label="Rechercher" onClick={() => setSearchMobile(true)}>
            <Icon name="search" />
          </button>
          <button className="icon-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </button>
        </div>
        {searchMobile && (
          <div className="mobile-search">
            {search}
            <button
              className="link"
              onClick={() => {
                setSearchMobile(false);
                setQ("");
              }}
            >
              Fermer
            </button>
          </div>
        )}
      </header>

      <main
        ref={box}
        className={"stage" + (sel ? " has-panel" : "")}
        tabIndex={0}
        aria-label="Arbre généalogique. Flèches pour se déplacer, plus et moins pour zoomer, zéro pour tout afficher."
        {...handlers}
        onKeyDown={onKey}
        onClick={(e) => {
          if (e.target === box.current && !gesture.current.moved) setSel(null);
        }}
      >
        <Scene id={ambiance} dx={v.x} dy={v.y} />

        {!loaded && (
          <p className="stage-msg" role="status">
            Chargement de l'arbre…
          </p>
        )}
        {loaded && loadError && (
          <p className="stage-msg form-error" role="alert">
            L'arbre n'a pas pu être chargé : {loadError}
          </p>
        )}
        {loaded && !loadError && !people.length && <p className="stage-msg">Cet arbre ne contient encore personne.</p>}

        <div
          ref={inner}
          className={"plane" + (anim ? " is-animating" : "")}
          style={{ transform: `translate(${v.x}px,${v.y}px) scale(${v.k})`, "--k": v.k } as CSSProperties}
        >
          <svg className="links" width={L.width || 1} height={L.height || 1} aria-hidden="true">
            {lines.map((l) => (
              <path key={l.key} d={l.d} className={near ? (l.ids.includes(selected!.id) ? "on" : "off") : ""} />
            ))}
            {couples.map((c) =>
              c.arc ? (
                <path
                  key={c.a.id + c.b.id}
                  className={
                    "spouse " + (near ? (near.has(c.a.id) && near.has(c.b.id) && (c.a.id === sel || c.b.id === sel) ? "on" : "off") : "")
                  }
                  d={`M${c.x1 - W / 2},${c.y - H / 2} C${c.x1 - W / 2},${c.y - H / 2 - 40} ${c.x2 + W / 2},${c.y - H / 2 - 40} ${c.x2 + W / 2},${c.y - H / 2}`}
                />
              ) : (
                <line
                  key={c.a.id + c.b.id}
                  className={"spouse " + (near ? (c.a.id === sel || c.b.id === sel ? "on" : "off") : "")}
                  x1={c.x1}
                  y1={c.y}
                  x2={c.x2}
                  y2={c.y}
                />
              ),
            )}
          </svg>
          {couples
            .filter((c) => !c.arc)
            .map((c) => {
              const u = unionOf(c.a.id, c.b.id);
              const broken = u && (u.type === "divorce" || u.type === "separation");
              return (
                <button
                  key={"u" + c.a.id + c.b.id}
                  className={"union" + (u ? " is-set" : "") + (broken ? " is-broken" : "")}
                  style={{ left: (c.x1 + c.x2) / 2, top: c.y }}
                  aria-label={`Union de ${c.a.first_name} et ${c.b.first_name}${u ? " : " + (u.type === "mariage" ? "mariage" : u.type) : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!gesture.current.moved) setUn({ a: c.a.id, b: c.b.id });
                  }}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <circle cx="7.5" cy="10" r="4.5" />
                    <circle cx="12.5" cy="10" r="4.5" />
                    {broken && <path d="M4 16 16 4" />}
                  </svg>
                </button>
              );
            })}
          {people.map((p) => {
            const c = L.pos.get(p.id);
            if (!c) return null;
            return (
              <PersonCard
                key={p.id}
                p={p}
                rel={rels.get(p.id) ?? ""}
                photo={p.photo_path ? urls[p.photo_path] : undefined}
                root={p.id === rootId}
                selected={sel === p.id}
                dim={!!near && !near.has(p.id)}
                style={{ left: c.x, top: c.y }}
                onSelect={() => {
                  if (!gesture.current.moved) select(sel === p.id ? null : p.id, sel !== p.id);
                }}
              />
            );
          })}
        </div>

        <div className="zoom" onPointerDown={(e) => e.stopPropagation()}>
          <button className="icon-btn" onClick={() => zoomAt(0.8, undefined, undefined, true)} aria-label="Dézoomer">
            <Icon name="minus" />
          </button>
          <span className="zoom-level" aria-live="polite">
            {Math.round(v.k * 100)} %
          </span>
          <button className="icon-btn" onClick={() => zoomAt(1.25, undefined, undefined, true)} aria-label="Zoomer">
            <Icon name="plus" />
          </button>
          <span className="zoom-sep" />
          <button className="icon-btn" onClick={fit} aria-label="Tout afficher" title="Tout afficher">
            <Icon name="fit" />
          </button>
          <button
            className="btn btn-quiet btn-small"
            onClick={() => center(rootId, Math.max(v.k, 0.8))}
            title={rootId && rels.get(rootId) === "Vous" ? "Revenir à moi" : "Recentrer"}
          >
            <Icon name="target" size={18} /> <span>{rootId && rels.get(rootId) === "Vous" ? "Revenir à moi" : "Recentrer"}</span>
          </button>
        </div>
        <p className="count">
          {people.filter((p) => p.kind === "human").length} personnes
          {people.some((p) => p.kind === "pet") ? `, ${people.filter((p) => p.kind === "pet").length} animaux` : ""}
        </p>
      </main>

      {selected && (
        <PersonPanel
          key={selected.id}
          p={selected}
          people={people}
          unions={unions}
          rel={rels.get(selected.id) ?? ""}
          photo={selected.photo_path ? urls[selected.photo_path] : undefined}
          canEdit={canEdit}
          isRoot={selected.id === rootId}
          onClose={() => setSel(null)}
          onGo={go}
          onCenter={() => center(selected.id, Math.max(v.k, 0.8))}
          onRoot={async () => {
            await upTree({ root_id: selected.id });
            say(`L'arbre part maintenant de ${selected.first_name}.`);
            setTimeout(() => center(selected.id, 0.9), 60);
          }}
          onSave={async (d) => {
            snap();
            const { error } = await patch(selected.id, d);
            if (error) say(frError(error.message), "error");
            else say("Fiche enregistrée.");
            await reload();
          }}
          onDelete={() => remove(selected)}
          onPhoto={(f) => onPhoto(selected, f)}
          onAdd={(rel) => setAdd({ rel, of: selected })}
          onUnion={(a, b) => setUn(a < b ? { a, b } : { a: b, b: a })}
        />
      )}

      {menu && (
        <div className="scrim" onMouseDown={() => setMenu(false)}>
          <nav className="sheet" aria-label="Menu" onMouseDown={(e) => e.stopPropagation()}>
            <header className="dialog-head">
              <h2>{t.title}</h2>
              <button className="icon-btn" onClick={() => setMenu(false)} aria-label="Fermer le menu">
                <Icon name="close" />
              </button>
            </header>
            <div className="sheet-tools">{tools(true)}</div>
          </nav>
        </div>
      )}
      {un && byId.get(un.a) && byId.get(un.b) && (
        <UnionDialog
          a={byId.get(un.a)!}
          b={byId.get(un.b)!}
          existing={unionOf(un.a, un.b)}
          canEdit={canEdit}
          onClose={() => setUn(null)}
          onSave={saveUnion}
        />
      )}
      <input
        ref={gedInput}
        type="file"
        accept=".ged,.GED,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) importGed(f);
        }}
      />
      {history && session && <HistoryDialog treeId={t.id} me={session.user.id} onClose={() => setHistory(false)} />}
      {exportOpen && (
        <ExportDialog
          rootName={(rootId && all.find((p) => p.id === rootId)?.first_name) || "la racine"}
          onClose={() => setExportOpen(false)}
          onExport={runExport}
        />
      )}
      {check && (
        <CheckDialog
          people={people}
          unions={unions}
          onClose={() => setCheck(false)}
          onGo={(id) => {
            setCheck(false);
            go(id);
          }}
        />
      )}
      {cal && (
        <CalendarDialog
          people={people}
          unions={unions}
          onClose={() => setCal(false)}
          onGo={(id) => {
            setCal(false);
            go(id);
          }}
        />
      )}
      {add && <AddDialog rel={add.rel} of={add.of} onClose={() => setAdd(null)} onSubmit={submitAdd} />}
      {share && (
        <ShareDialog
          tree={t}
          role={role}
          onClose={() => setShare(false)}
          onAccess={(v) => upTree({ link_access: v })}
          onInvite={invite}
          me={session!.user.id}
        />
      )}
    </div>
  );
}
