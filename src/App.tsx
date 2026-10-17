import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { toPng } from "html-to-image";
import { Scene, SCENES } from "./scenes";
import { type Person, type Tree, SPECIES, flag, W, H, layout, relation } from "./lib";

const inp = "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary";
const btn = "rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground";
const ghost = "rounded-full border border-line bg-card px-4 py-2 text-sm";
const Logo = () => <span className="font-serif text-2xl font-semibold text-primary">🌳 Mon Arbre Généalogique</span>;
const uid = () => crypto.randomUUID();
const split = (s: string, def = "") => {
  const [f = "", ...r] = s.trim().split(/\s+/);
  return { first_name: f, last_name: r.join(" ") || def };
};
const UNIONS: [string, string][] = [["mariage", "Mariage civil"], ["mariage-religieux", "Mariage religieux"], ["pacs", "PACS"], ["union-libre", "Union libre"], ["fiancailles", "Fiançailles"], ["divorce", "Divorcés"], ["separation", "Séparés"]];
const ICON: Record<string, string> = { mariage: "💍", "mariage-religieux": "⛪", pacs: "📜", "union-libre": "💞", fiancailles: "💎", divorce: "💔", separation: "💔" };
const dl = (href: string, name: string) => { const a = document.createElement("a"); a.href = href; a.download = name; a.click(); };
const gedDate = (d: string) => { const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${+m[1]} ${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][+m[2] - 1]} ${m[3]}` : d; };
const compress = (f: File) => new Promise<Blob>((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
    c.width = img.width * k; c.height = img.height * k;
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? res(b) : rej()), "image/webp", 0.85);
  };
  img.onerror = rej; img.src = URL.createObjectURL(f);
});
const Modal = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
    <div className="w-full max-w-md rounded-3xl bg-card p-6 text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
);

/* ---------- Accueil + connexion ---------- */
function Landing() {
  const [scene, setScene] = useState("foret");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const go = async (up: boolean) => {
    const r = up ? await supabase.auth.signUp({ email, password: pw }) : await supabase.auth.signInWithPassword({ email, password: pw });
    setMsg(r.error ? r.error.message : up && !r.data.session ? "Vérifiez votre boîte mail pour confirmer votre compte." : "");
  };
  const tiles = [["🧭", "Un assistant qui vous guide", "Six questions simples, jamais bloquantes : « Passer » est toujours là.", "md:col-span-2"], ["🌄", "Des paysages vivants", "Forêt d'automne, montagnes, coucher de soleil, prairie ou nuit étoilée : votre arbre vit dans un décor animé.", "md:row-span-2"], ["🌍", "Origines en drapeaux", "Chaque carte affiche les pays de la famille.", ""], ["🐾", "Les animaux aussi", "Chiens, chats, chevaux… ils ont leur carte.", ""], ["🤝", "Construisez à plusieurs", "Invitez vos proches, choisissez leurs droits, voyez les changements en direct.", "md:col-span-2"]];
  return (
    <div className={`preset-${SCENES[scene].preset} bg-background text-foreground`}>
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <Scene id={scene} />
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="glass rounded-full border border-line px-5 py-2"><Logo /></div>
          <a href="#inscription" className={btn}>Créer mon arbre</a>
        </header>
        <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-8 md:grid-cols-[1.25fr_1fr]">
          <div>
            <span className="glass inline-block rounded-full border border-line px-4 py-1 text-xs font-bold uppercase tracking-widest text-accent">Généalogie collaborative</span>
            <h1 className="mt-6 font-serif text-7xl leading-[0.88] text-primary md:text-[8.5rem]">Votre histoire<br /><em className="text-accent">racontée.</em></h1>
            <p className="mt-6 max-w-md text-lg">Un arbre généalogique qui se dessine en quelques réponses, dans un paysage qui vous ressemble, et que toute la famille complète ensemble.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#inscription" className={btn}>Créer mon arbre gratuitement →</a><a href="#comment" className={ghost + " glass"}>Découvrir</a></div>
          </div>
          <div className="relative hidden h-[420px] md:block">
            {[["Henri", "Grand-père", "🇫🇷", "left-0 top-2 -rotate-6"], ["Sophie", "Mère", "🇵🇹", "right-2 top-28 rotate-3"], ["Lucas", "Vous", "🇫🇷 🇲🇺", "left-14 bottom-2 -rotate-2"]].map(([n, r, f, c], i) => (
              <div key={n} style={{ animationDelay: `${i * 1.3}s` }} className={`glass fx-float absolute w-44 rounded-2xl border border-line p-4 text-center shadow-xl ${c}`}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-muted to-line/60 font-serif text-2xl text-primary ring-2 ring-gold/40">{n[0]}</div>
                <h3 className="mt-2 font-serif text-xl font-semibold">{n}</h3><p className="text-xs italic text-muted-foreground">{r}</p><p>{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 mx-auto mb-8 flex flex-wrap items-center justify-center gap-2 px-4">
          <span className="text-sm font-bold">Choisissez votre paysage :</span>
          {Object.entries(SCENES).map(([k, x]) => <button key={k} onClick={() => setScene(k)} className={`glass rounded-full border px-4 py-2 text-sm ${k === scene ? "border-primary font-bold" : "border-line"}`}>{x.icon} {x.name}</button>)}
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-6">
        <section id="comment" className="py-20">
          <h2 className="text-center font-serif text-5xl text-primary md:text-6xl">Tout pour raconter votre famille</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {tiles.map(([i, t, d, c]) => <div key={t} className={`rounded-3xl border border-line bg-card p-8 shadow-sm ${c}`}><div className="text-4xl">{i}</div><h3 className="mt-4 font-serif text-3xl font-semibold">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p></div>)}
          </div>
        </section>
        <section id="inscription" className="mx-auto max-w-md pb-20">
          <div className="space-y-3 rounded-3xl border border-line bg-card p-8 shadow-xl">
            <h2 className="font-serif text-4xl font-semibold">Créer mon arbre</h2>
            <p className="text-sm text-muted-foreground">Gratuit · Enregistré automatiquement · Prêt en 3 minutes</p>
            <input className={inp} type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inp} type="password" placeholder="Mot de passe (6 caractères minimum)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className={btn + " w-full"} onClick={() => go(true)}>Créer mon arbre gratuitement →</button>
            <button className="w-full text-sm underline" onClick={() => go(false)}>J'ai déjà un compte : me connecter</button>
            {msg && <p className="text-sm text-accent">{msg}</p>}
          </div>
        </section>
      </main>
      <footer className="pb-8 text-center text-sm text-muted-foreground">Mon Arbre Généalogique · fait avec soin pour les familles</footer>
    </div>
  );
}

/* ---------- Assistant de création (6 étapes) ---------- */
function ListEditor({ items, set, ph }: { items: string[]; set: (x: string[]) => void; ph: string }) {
  return (
    <div className="space-y-3">
      {items.map((x, i) => <input key={i} className={inp} placeholder={ph} value={x} onChange={(e) => set(items.map((y, j) => (j === i ? e.target.value : y)))} />)}
      <button className="w-full rounded-2xl border-2 border-dashed border-line bg-muted p-4 text-sm" onClick={() => set([...items, ""])}>+ Ajouter</button>
    </div>
  );
}

function Wizard({ session, onDone }: { session: Session; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({ gender: "u" });
  const [sibs, setSibs] = useState<string[]>([]);
  const [kids, setKids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const f = (k: string, ph: string) => <input className={inp} placeholder={ph} value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} />;
  const titles = ["Commençons par vous.", "Ajoutons vos parents.", "Vos frères et sœurs.", "Vos grands-parents.", "Avez-vous des enfants ?", "Un conjoint ou une conjointe ?"];
  const hints = ["Votre prénom et votre nom suffisent.", "Seulement ceux que vous connaissez : prénom et nom.", "Vous pouvez passer cette étape.", "Remplissez seulement ceux que vous connaissez.", "Vous pourrez en ajouter d'autres plus tard.", "Dernière étape !"];

  const finish = async () => {
    if (!v.me?.trim()) return setStep(0);
    setBusy(true);
    const me = split(v.me);
    const { data: t, error } = await supabase.from("trees").insert({ title: `Famille ${me.last_name || me.first_name}`, owner_id: session.user.id }).select().single();
    if (error) { setBusy(false); return alert(error.message); }
    const rows: any[] = [];
    const mk = (name: string | undefined, gender: string, def = "") => {
      if (!name?.trim()) return null;
      const r: any = { id: uid(), tree_id: t.id, kind: "human", gender, origins: [], parent_ids: [], spouse_ids: [], ...split(name, def) };
      rows.push(r);
      return r;
    };
    const up = (parent: any, a?: string, b?: string, label = "", g = "u") => {
      const ga = mk(a, "m", parent?.last_name ?? ""), gb = mk(b, "f");
      if (!ga && !gb) return parent;
      const p = parent ?? mk(label, g);
      p.parent_ids = [ga, gb].filter(Boolean).map((x: any) => x.id);
      if (ga && gb) { ga.spouse_ids = [gb.id]; gb.spouse_ids = [ga.id]; }
      return p;
    };
    const meR = mk(v.me, v.gender);
    let fa = mk(v.father, "m", me.last_name), mo = mk(v.mother, "f");
    fa = up(fa, v.pf, v.pm, "Père", "m");
    mo = up(mo, v.mf, v.mm, "Mère", "f");
    const par = [fa, mo].filter(Boolean).map((x: any) => x.id);
    if (fa && mo) { fa.spouse_ids = [mo.id]; mo.spouse_ids = [fa.id]; }
    meR.parent_ids = par;
    sibs.forEach((s) => { const r = mk(s, "u", me.last_name); if (r) r.parent_ids = par; });
    const sp = mk(v.spouse, "u");
    if (sp) { sp.spouse_ids = [meR.id]; meR.spouse_ids = [sp.id]; }
    kids.forEach((k) => { const r = mk(k, "u", me.last_name); if (r) r.parent_ids = [meR.id, ...(sp ? [sp.id] : [])]; });
    const { error: e2 } = await supabase.from("people").insert(rows);
    if (e2) { setBusy(false); return alert(e2.message); }
    await supabase.from("trees").update({ root_id: meR.id }).eq("id", t.id);
    onDone();
  };

  const body = [
    <div className="space-y-3" key="0">{f("me", "Votre prénom et nom")}
      <div className="flex gap-2">{[["m", "Je suis un homme"], ["f", "Je suis une femme"]].map(([g, l]) => <button key={g} className={ghost + (v.gender === g ? " border-primary font-bold" : "")} onClick={() => setV({ ...v, gender: g })}>{l}</button>)}</div></div>,
    <div className="space-y-3" key="1">{f("father", "Père : prénom et nom")}{f("mother", "Mère : prénom et nom")}</div>,
    <ListEditor key="2" items={sibs} set={setSibs} ph="Prénom (et nom)" />,
    <div className="grid gap-3 sm:grid-cols-2" key="3">{f("pf", "Grand-père paternel")}{f("pm", "Grand-mère paternelle")}{f("mf", "Grand-père maternel")}{f("mm", "Grand-mère maternelle")}</div>,
    <ListEditor key="4" items={kids} set={setKids} ph="Prénom (et nom) de l'enfant" />,
    <div key="5">{f("spouse", "Prénom et nom de votre conjoint(e)")}</div>,
  ][step];

  return (
    <div className="preset-nature relative min-h-screen"><Scene id="prairie" className="fixed inset-0" />
      <div className="relative mx-auto max-w-2xl px-6 py-6">
        <Logo />
        <div className="mt-5 flex gap-2">{titles.map((_, i) => <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-primary" : "bg-line"}`} />)}</div>
        <p className="mt-8 text-xs font-bold uppercase tracking-widest text-accent">Étape {step + 1} sur 6</p>
        <h1 className="mt-2 font-serif text-5xl text-primary">{titles[step]}</h1>
        <p className="mt-2 text-muted-foreground">{hints[step]}</p>
        <div className="mt-8 glass rounded-3xl border border-line p-6 shadow-lg">{body}</div>
        <div className="mt-8 flex items-center justify-between">
          <button disabled={!step} className="text-sm disabled:opacity-30" onClick={() => setStep(step - 1)}>← Retour</button>
          <div className="flex items-center gap-4">
            {step > 0 && <button className="text-sm" onClick={() => (step === 5 ? finish() : setStep(step + 1))}>Passer</button>}
            <button disabled={busy} className={btn} onClick={() => (step === 5 ? finish() : setStep(step + 1))}>{step === 5 ? (busy ? "Création…" : "Créer mon arbre →") : "Continuer →"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Fiche détaillée ---------- */
const FIELDS: [string, string][] = [["first_name", "Prénom"], ["last_name", "Nom"], ["birth", "Naissance (JJ/MM/AAAA)"], ["birth_time", "Heure de naissance"], ["birth_place", "Lieu de naissance"], ["death", "Décès (si applicable)"], ["job", "Métier"], ["origins", "Pays d'origine (FR, PT, MU…)"]];
function Drawer({ p, photo, onPhoto, canEdit, isRoot, onClose, onSave, onDelete, onRoot }: { p: Person; photo?: string; onPhoto: (f: File) => void; canEdit: boolean; isRoot: boolean; onClose: () => void; onSave: (d: Partial<Person>) => void; onDelete: () => void; onRoot: () => void }) {
  const [d, setD] = useState<Record<string, string>>({ ...Object.fromEntries(FIELDS.map(([k]) => [k, k === "origins" ? p.origins.join(", ") : ((p as any)[k] ?? "")])), gender: p.gender, notes: p.notes ?? "" });
  return (
    <aside className="fixed right-0 top-0 z-40 h-full w-full max-w-sm overflow-y-auto border-l border-line bg-card p-6 shadow-xl">
      <button className="float-right text-xl" onClick={onClose}>✕</button>
      <h2 className="font-serif text-3xl font-semibold">{p.first_name} {p.last_name}</h2>
      <div className="mt-4 flex items-center gap-4">
        {photo ? <img src={photo} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold/40" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-3xl">📷</div>}
        {canEdit && <label className={ghost + " cursor-pointer"}>{photo ? "Changer la photo" : "Ajouter une photo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} /></label>}
      </div>
      <div className="mt-5 space-y-3">
        {FIELDS.map(([k, l]) => <label key={k} className="block text-xs text-muted-foreground">{l}<input disabled={!canEdit} className={inp + " mt-1"} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></label>)}
        <select disabled={!canEdit} className={inp} value={d.gender} onChange={(e) => setD({ ...d, gender: e.target.value })}><option value="u">Genre : inconnu</option><option value="f">Femme</option><option value="m">Homme</option></select>
        <textarea disabled={!canEdit} rows={4} className={inp} placeholder="Souvenirs, anecdotes…" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        {canEdit && <button className={btn + " w-full"} onClick={() => { const { origins, gender, notes, ...rest } = d; onSave({ ...rest, gender: gender as Person["gender"], notes: notes || null, origins: origins.split(/[ ,;]+/).filter(Boolean).map((s) => s.toUpperCase()) } as Partial<Person>); }}>Enregistrer</button>}
        {!isRoot && p.kind === "human" && <button className={ghost + " w-full"} onClick={onRoot}>Voir l'arbre depuis cette personne</button>}
        {canEdit && <button className="w-full text-sm text-accent underline" onClick={onDelete}>Supprimer cette personne</button>}
      </div>
    </aside>
  );
}

/* ---------- Canevas de l'arbre ---------- */
const QUICK: [string, string][] = [["father", "+ Père"], ["mother", "+ Mère"], ["spouse", "+ Conjoint(e)"], ["sibling", "+ Frère / Sœur"], ["child", "+ Enfant"], ["pet", "+ Animal"]];

function Canvas({ tree, session }: { tree: Tree; session: Session | null }) {
  const [t, setT] = useState(tree);
  const [people, setPeople] = useState<Person[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [add, setAdd] = useState<{ rel: string; of: Person } | null>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("chien");
  const [edit, setEdit] = useState<Person | null>(null);
  const [share, setShare] = useState(false);
  const [inv, setInv] = useState({ email: "", role: "editor" });
  const [q, setQ] = useState("");
  const [v, setV] = useState({ x: 0, y: 0, k: 0.9 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, y: 0, moved: false });
  const centered = useRef(false);
  const inner = useRef<HTMLDivElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [unions, setUnions] = useState<Record<string, any>>({});
  const [un, setUn] = useState<{ a: string; b: string; d: any } | null>(null);
  const [cal, setCal] = useState(false);
  const hist = useRef<{ u: Person[][]; r: Person[][] }>({ u: [], r: [] });

  const load = async () => {
    const { data } = await supabase.from("people").select("*").eq("tree_id", tree.id).order("created_at");
    const ps = (data as Person[]) || [];
    setPeople(ps);
    const paths = ps.filter((p) => p.photo_path).map((p) => p.photo_path!);
    if (paths.length) {
      const { data: sg } = await supabase.storage.from("tree-media").createSignedUrls(paths, 3600);
      const m: Record<string, string> = {};
      sg?.forEach((x) => { if (x.path && x.signedUrl) m[x.path] = x.signedUrl; });
      setUrls(m);
    }
    const { data: u } = await supabase.from("unions").select("*").eq("tree_id", tree.id);
    setUnions(Object.fromEntries((u || []).map((x: any) => [x.person_a + x.person_b, x])));
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("p-" + tree.id).on("postgres_changes", { event: "*", schema: "public", table: "people", filter: `tree_id=eq.${tree.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tree.id]);
  useEffect(() => {
    if (session) supabase.from("tree_members").select("role").eq("tree_id", tree.id).eq("user_id", session.user.id).maybeSingle().then(({ data }) => setRole(data?.role ?? null));
  }, [tree.id, session]);

  const canEdit = (!!role && role !== "viewer") || (!!session && t.link_access === "edit");
  const canAdmin = role === "owner" || role === "co_lead";
  const pos = layout(people, t.root_id);
  const rootId = t.root_id ?? people[0]?.id ?? null;

  const center = (id: string | null, k = v.k) => {
    const c = id ? pos.get(id) : undefined, b = box.current;
    if (c && b) setV({ k, x: b.clientWidth / 2 - (c.x + W / 2) * k, y: b.clientHeight / 2 - (c.y + H / 2) * k });
  };
  useEffect(() => {
    if (people.length && !centered.current) { centered.current = true; center(rootId, 0.9); }
  }, [people.length]);

  const zoom = (f: number, mx?: number, my?: number) => {
    const b = box.current!, cx = mx ?? b.clientWidth / 2, cy = my ?? b.clientHeight / 2;
    const k = Math.min(2, Math.max(0.25, v.k * f)), r = k / v.k;
    setV({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r });
  };
  const patch = (id: string, d: Record<string, unknown>) => supabase.from("people").update(d).eq("id", id);

  const snap = () => { hist.current = { u: [...hist.current.u.slice(-29), people], r: [] }; };
  const restore = async (rows: Person[]) => {
    const keep = new Set(rows.map((p) => p.id)), gone = people.filter((p) => !keep.has(p.id)).map((p) => p.id);
    if (gone.length) await supabase.from("people").delete().in("id", gone);
    if (rows.length) await supabase.from("people").upsert(rows);
    load();
  };
  const undo = async () => { const prev = hist.current.u.pop(); if (!prev) return; hist.current.r.push(people); await restore(prev); };
  const redo = async () => { const nxt = hist.current.r.pop(); if (!nxt) return; hist.current.u.push(people); await restore(nxt); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); } else if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [people]);

  const onPhoto = async (p: Person, f: File) => {
    try {
      const path = `${t.id}/${p.id}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("tree-media").upload(path, await compress(f), { contentType: "image/webp" });
      if (error) return alert(error.message);
      snap(); await patch(p.id, { photo_path: path }); load();
    } catch { alert("Cette image ne peut pas être lue."); }
  };
  const saveUnion = async (e: FormEvent) => {
    e.preventDefault();
    const { type, date, place, notes } = un!.d;
    const { error } = await supabase.from("unions").upsert({ tree_id: t.id, person_a: un!.a, person_b: un!.b, type, date: date || null, place: place || null, notes: notes || null });
    if (error) return alert(error.message);
    setUn(null); load();
  };
  const exportPng = async () => {
    setSel(null);
    const xs = [...pos.values()];
    const w = Math.max(...xs.map((c) => c.x)) + W + 80, h = Math.max(...xs.map((c) => c.y)) + H + 80;
    dl(await toPng(inner.current!, { width: w, height: h, pixelRatio: 2, backgroundColor: "#faf6ee", style: { transform: "translate(40px,40px)" } }), "mon-arbre.png");
  };
  const exportGed = () => {
    const idx = new Map(people.map((p, i) => [p.id, i + 1])), hum = people.filter((p) => p.kind === "human"), by = new Map(people.map((p) => [p.id, p]));
    const fams = new Map<string, { par: string[]; kids: string[] }>();
    const fam = (par: string[]) => { const k = [...par].sort().join("|"); if (!fams.has(k)) fams.set(k, { par, kids: [] }); return fams.get(k)!; };
    hum.forEach((p) => { const par = p.parent_ids.filter((i) => by.get(i)?.kind === "human"); if (par.length) fam(par).kids.push(p.id); p.spouse_ids.forEach((s) => by.has(s) && fam([p.id, s])); });
    const famId = new Map([...fams.keys()].map((k, i) => [k, i + 1]));
    let o = "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n";
    hum.forEach((p) => {
      o += `0 @I${idx.get(p.id)}@ INDI\n1 NAME ${p.first_name} /${p.last_name}/\n1 SEX ${p.gender === "m" ? "M" : p.gender === "f" ? "F" : "U"}\n`;
      if (p.birth || p.birth_place) o += "1 BIRT\n" + (p.birth ? `2 DATE ${gedDate(p.birth)}\n` : "") + (p.birth_place ? `2 PLAC ${p.birth_place}\n` : "");
      if (p.death) o += `1 DEAT\n2 DATE ${gedDate(p.death)}\n`;
      fams.forEach((f, k) => { if (f.kids.includes(p.id)) o += `1 FAMC @F${famId.get(k)}@\n`; if (f.par.includes(p.id)) o += `1 FAMS @F${famId.get(k)}@\n`; });
    });
    fams.forEach((f, k) => {
      const h = f.par.find((i) => by.get(i)?.gender === "m") ?? f.par[0], w = f.par.find((i) => i !== h);
      o += `0 @F${famId.get(k)}@ FAM\n` + (h ? `1 HUSB @I${idx.get(h)}@\n` : "") + (w ? `1 WIFE @I${idx.get(w)}@\n` : "") + f.kids.map((c) => `1 CHIL @I${idx.get(c)}@\n`).join("");
    });
    dl(URL.createObjectURL(new Blob([o + "0 TRLR\n"], { type: "text/plain" })), "mon-arbre.ged");
  };
  const events = () => {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), out: { label: string; d: Date; n: number }[] = [];
    const add = (label: string, s?: string | null) => {
      const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return;
      let d = new Date(today.getFullYear(), +m[2] - 1, +m[1]);
      if (d < today) d = new Date(today.getFullYear() + 1, +m[2] - 1, +m[1]);
      out.push({ label, d, n: d.getFullYear() - +m[3] });
    };
    people.forEach((p) => p.kind === "human" && !p.death && add(`🎂 ${p.first_name} ${p.last_name}`, p.birth));
    Object.values(unions).forEach((u: any) => { const a = people.find((p) => p.id === u.person_a), b = people.find((p) => p.id === u.person_b); if (a && b && ["mariage", "mariage-religieux", "pacs"].includes(u.type)) add(`💍 ${a.first_name} & ${b.first_name}`, u.date); });
    return out.sort((x, y) => +x.d - +y.d).slice(0, 15);
  };

  const submitAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!add || !name.trim()) return;
    const { rel, of } = add;
    snap();
    const row: any = { id: uid(), tree_id: t.id, kind: "human", gender: "u", origins: [], parent_ids: [], spouse_ids: [], ...split(name, rel === "child" || rel === "sibling" || rel === "father" ? of.last_name : "") };
    const ins = async () => { const { error } = await supabase.from("people").insert(row); if (error) alert(error.message); };
    if (rel === "father" || rel === "mother") {
      row.gender = rel === "father" ? "m" : "f";
      const other = people.find((p) => of.parent_ids.includes(p.id));
      if (other) row.spouse_ids = [other.id];
      await ins();
      await patch(of.id, { parent_ids: [...of.parent_ids, row.id] });
      if (other) await patch(other.id, { spouse_ids: [...other.spouse_ids, row.id] });
    } else if (rel === "spouse") {
      row.spouse_ids = [of.id];
      await ins();
      await patch(of.id, { spouse_ids: [...of.spouse_ids, row.id] });
    } else if (rel === "sibling") {
      if (!of.parent_ids.length) return alert("Ajoutez d'abord un père ou une mère à cette personne.");
      row.parent_ids = of.parent_ids;
      await ins();
    } else if (rel === "child") {
      row.parent_ids = [of.id, ...of.spouse_ids.slice(0, 1)];
      await ins();
    } else {
      row.kind = "pet"; row.species = species; row.parent_ids = [of.id];
      await ins();
    }
    setAdd(null); setName(""); load();
  };

  const remove = async (p: Person) => {
    if (!confirm(`Supprimer ${p.first_name} ${p.last_name} ?`)) return;
    snap();
    for (const o of people) {
      if (o.parent_ids.includes(p.id)) await patch(o.id, { parent_ids: o.parent_ids.filter((x) => x !== p.id) });
      if (o.spouse_ids.includes(p.id)) await patch(o.id, { spouse_ids: o.spouse_ids.filter((x) => x !== p.id) });
    }
    await supabase.from("people").delete().eq("id", p.id);
    setEdit(null); setSel(null); load();
  };
  const upTree = async (d: Record<string, unknown>) => { await supabase.from("trees").update(d).eq("id", t.id); setT({ ...t, ...d } as Tree); };
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tree_invites").insert({ tree_id: t.id, email: inv.email.trim().toLowerCase(), role: inv.role, invited_by: session!.user.id });
    alert(error ? error.message : "Invitation enregistrée : la personne la recevra en se connectant avec cet email.");
    setInv({ ...inv, email: "" });
  };
  const search = (e: FormEvent) => {
    e.preventDefault();
    const m = people.find((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q.toLowerCase()));
    if (m) { setSel(m.id); center(m.id, 1); } else alert("Personne introuvable.");
  };

  return (
    <div className={`preset-${(SCENES[t.settings?.preset ?? ""] ?? SCENES.prairie).preset} flex h-screen flex-col bg-background text-foreground`}>
      <header className="z-30 flex flex-wrap items-center gap-3 glass border-b border-line px-4 py-2">
        <Logo />
        <form onSubmit={search} className="ml-auto"><input className={inp + " !w-44 !py-2"} placeholder="🔍 Rechercher" value={q} onChange={(e) => setQ(e.target.value)} /></form>
        <select className={ghost} value={SCENES[t.settings?.preset ?? ""] ? t.settings.preset : "prairie"} onChange={(e) => upTree({ settings: { ...t.settings, preset: e.target.value } })} disabled={!canAdmin}>
          {Object.entries(SCENES).map(([k, x]) => <option key={k} value={k}>{x.icon} {x.name}</option>)}
        </select>
        {canEdit && <><button className={ghost} onClick={undo}>↶ Annuler</button><button className={ghost} onClick={redo}>↷</button></>}
        <button className={ghost} onClick={() => setCal(true)}>📅 Anniversaires</button>
        <select className={ghost} value="" onChange={(e) => { if (e.target.value === "png") exportPng(); if (e.target.value === "ged") exportGed(); }}>
          <option value="">⬇ Exporter</option><option value="png">Image PNG</option><option value="ged">Fichier GEDCOM</option>
        </select>
        {canAdmin && <button className={ghost} onClick={() => setShare(true)}>Partager</button>}
        {session && <button className={ghost} onClick={() => supabase.auth.signOut()}>Quitter</button>}
      </header>

      <div ref={box} className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
          drag.current.x = e.clientX; drag.current.y = e.clientY;
          setV((o) => ({ ...o, x: o.x + dx, y: o.y + dy }));
        }}
        onWheel={(e) => { const r = box.current!.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }}
        onClick={() => { if (!drag.current.moved) setSel(null); }}>
        <Scene id={SCENES[t.settings?.preset ?? ""] ? t.settings.preset! : "prairie"} dx={v.x} dy={v.y} />
        <div ref={inner} style={{ transform: `translate(${v.x}px,${v.y}px) scale(${v.k})`, transformOrigin: "0 0" }} className="absolute left-0 top-0">
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
            {people.map((p) => {
              const c = pos.get(p.id)!, ps = p.parent_ids.map((i) => pos.get(i)).filter(Boolean) as { x: number; y: number }[];
              if (!c || !ps.length) return null;
              const px = ps.reduce((a, b) => a + b.x, 0) / ps.length + W / 2, py = ps[0].y + H, my = py + (c.y - py) / 2;
              return <path key={p.id} d={`M${px},${py} V${my} H${c.x + W / 2} V${c.y}`} fill="none" stroke="var(--color-primary)" strokeOpacity="0.55" strokeWidth="3" strokeLinejoin="round" />;
            })}
            {people.flatMap((p) => p.spouse_ids.filter((s) => p.id < s).map((s) => {
              const a = pos.get(p.id), b = pos.get(s);
              if (!a || !b || a.y !== b.y) return null;
              const [l, r] = a.x < b.x ? [a, b] : [b, a], y = l.y + H / 2;
              return <g key={p.id + s}><line x1={l.x + W} y1={y} x2={r.x} y2={y} stroke="var(--color-gold)" strokeWidth="2.5" strokeDasharray="5 4" /><text x={(l.x + W + r.x) / 2} y={y + 6} textAnchor="middle" fontSize="20" style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => setUn({ a: p.id, b: s, d: unions[p.id + s] ?? { type: "mariage" } })}>{ICON[unions[p.id + s]?.type ?? "mariage"]}</text></g>;
            }))}
          </svg>
          {people.map((p) => {
            const c = pos.get(p.id);
            if (!c) return null;
            const on = sel === p.id;
            return (
              <div key={p.id} style={{ left: c.x, top: c.y, width: W, height: H }}
                onClick={(e) => { e.stopPropagation(); if (!drag.current.moved) setSel(on ? null : p.id); }}
                className={`absolute cursor-pointer glass rounded-2xl border p-3 text-center shadow-md transition-shadow hover:shadow-xl ${on ? "border-primary ring-2 ring-primary/30" : "border-line"} ${p.id === rootId ? "border-t-4 border-t-gold" : ""}`}>
                {p.photo_path && urls[p.photo_path] ? <img src={urls[p.photo_path]} alt="" className="mx-auto h-14 w-14 rounded-full object-cover ring-2 ring-gold/40" /> : <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-muted to-line/60 font-serif text-2xl text-primary ring-2 ring-gold/40">{p.kind === "pet" ? SPECIES[p.species || "autre"] : (p.first_name[0] || "?").toUpperCase()}</div>}
                <h3 className="mt-2 font-serif text-lg font-semibold leading-tight">{p.first_name} <span className="uppercase">{p.last_name}</span></h3>
                <p className="text-xs text-muted-foreground">{[p.birth?.slice(-4), p.death && "† " + p.death.slice(-4)].filter(Boolean).join(" – ")}</p>
                <p className="text-base">{p.origins.map(flag).join(" ")}</p>
                <p className="absolute bottom-2 left-0 right-0 text-[11px] italic text-muted-foreground">{relation(people, rootId, p)}</p>
                {on && (
                  <div className="absolute left-1/2 top-full z-10 mt-2 flex w-max max-w-[400px] -translate-x-1/2 flex-wrap justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canEdit && p.kind === "human" && QUICK.map(([rel, l]) => <button key={rel} className="rounded-full border border-line bg-card px-3 py-1 text-xs shadow-sm" onClick={() => { setAdd({ rel, of: p }); setName(""); }}>{l}</button>)}
                    <button className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground" onClick={() => setEdit(p)}>Fiche</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-5 left-5 flex items-center gap-1 glass rounded-full border border-line px-3 py-1 text-sm shadow">
          <button className="px-2" onClick={() => zoom(0.8)}>−</button>
          <span className="w-10 text-center text-xs">{Math.round(v.k * 100)}%</span>
          <button className="px-2" onClick={() => zoom(1.25)}>+</button>
          <button className="ml-2 px-2 text-xs" onClick={() => center(rootId, 0.9)}>◎ Centrer sur moi</button>
        </div>
      </div>

      {un && (
        <Modal onClose={() => setUn(null)}>
          <form onSubmit={saveUnion} className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Leur union {ICON[un.d.type]}</h2>
            <select className={inp} value={un.d.type} onChange={(e) => setUn({ ...un, d: { ...un.d, type: e.target.value } })}>{UNIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            {[["date", "Date (JJ/MM/AAAA)"], ["place", "Lieu de la cérémonie"], ["notes", "Témoins, souvenirs…"]].map(([k, l]) => <input key={k} className={inp} placeholder={l} value={un.d[k] ?? ""} onChange={(e) => setUn({ ...un, d: { ...un.d, [k]: e.target.value } })} />)}
            {canEdit && <button className={btn + " w-full"}>Enregistrer</button>}
          </form>
        </Modal>
      )}
      {cal && (
        <Modal onClose={() => setCal(false)}>
          <h2 className="font-serif text-2xl font-semibold">Prochains anniversaires</h2>
          <ul className="mt-4 space-y-2">
            {events().map((e, i) => <li key={i} className="flex justify-between rounded-xl bg-muted px-4 py-2 text-sm"><span>{e.label} <span className="text-muted-foreground">({e.n} ans)</span></span><b>{e.d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</b></li>)}
            {!events().length && <li className="text-sm text-muted-foreground">Ajoutez des dates de naissance (JJ/MM/AAAA) dans les fiches.</li>}
          </ul>
        </Modal>
      )}
      {add && (
        <Modal onClose={() => setAdd(null)}>
          <form onSubmit={submitAdd} className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">{QUICK.find(([r]) => r === add.rel)![1].slice(2)} de {add.of.first_name}</h2>
            <input autoFocus required className={inp} placeholder={add.rel === "pet" ? "Nom de l'animal" : "Prénom et nom"} value={name} onChange={(e) => setName(e.target.value)} />
            {add.rel === "pet" && <select className={inp} value={species} onChange={(e) => setSpecies(e.target.value)}>{Object.keys(SPECIES).map((s) => <option key={s} value={s}>{SPECIES[s]} {s}</option>)}</select>}
            <button className={btn + " w-full"}>Ajouter à l'arbre</button>
          </form>
        </Modal>
      )}
      {share && (
        <Modal onClose={() => setShare(false)}>
          <div className="space-y-3">
            <h2 className="font-serif text-2xl font-semibold">Partager l'arbre</h2>
            <select className={inp} value={t.link_access} onChange={(e) => upTree({ link_access: e.target.value })}>
              <option value="private">Privé : sur invitation uniquement</option>
              <option value="view">Toute personne avec le lien peut voir</option>
              <option value="edit">Toute personne connectée avec le lien peut modifier</option>
            </select>
            {t.link_access !== "private" && <input readOnly className={inp} value={`${location.origin}/?arbre=${t.id}`} onFocus={(e) => e.target.select()} />}
            <form onSubmit={invite} className="flex flex-wrap gap-2">
              <input required type="email" className={inp + " flex-1"} placeholder="Email à inviter" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
              <select className={ghost} value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}><option value="viewer">Lecteur</option><option value="editor">Éditeur</option>{role === "owner" && <option value="co_lead">Chef adjoint</option>}</select>
              <button className={btn}>Inviter</button>
            </form>
          </div>
        </Modal>
      )}
      {edit && <Drawer key={edit.id} p={edit} photo={edit.photo_path ? urls[edit.photo_path] : undefined} onPhoto={(f) => onPhoto(edit, f)} canEdit={canEdit} isRoot={edit.id === rootId} onClose={() => setEdit(null)} onDelete={() => remove(edit)}
        onRoot={() => { upTree({ root_id: edit.id }); setEdit(null); setTimeout(() => center(edit.id, 0.9), 50); }}
        onSave={async (d) => { snap(); await patch(edit.id, d); setEdit(null); load(); }} />}
    </div>
  );
}

/* ---------- Application ---------- */
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tree, setTree] = useState<Tree | null | undefined>(undefined);
  const shared = new URLSearchParams(location.search).get("arbre");

  const loadTree = async (s: Session) => {
    await supabase.rpc("claim_invites");
    const { data: m } = await supabase.from("tree_members").select("tree_id").eq("user_id", s.user.id).order("created_at").limit(1);
    if (!m?.length) return setTree(null);
    const { data } = await supabase.from("trees").select("*").eq("id", m[0].tree_id).single();
    setTree(data as Tree);
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (shared) supabase.from("trees").select("*").eq("id", shared).maybeSingle().then(({ data }) => setTree((data as Tree) ?? null));
    else if (session) loadTree(session);
    else setTree(undefined);
  }, [session?.user.id, shared]);

  if (!ready) return <p className="p-10 font-serif text-2xl">Chargement…</p>;
  if (!shared && !session) return <Landing />;
  if (tree === undefined) return <p className="p-10 font-serif text-2xl">Chargement de votre arbre…</p>;
  if (tree === null) return shared ? <p className="p-10 font-serif text-2xl">Cet arbre est privé ou n'existe pas.</p> : <Wizard session={session!} onDone={() => loadTree(session!)} />;
  return <Canvas key={tree.id} tree={tree} session={session} />;
}
