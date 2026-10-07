import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Person = {
  id: string; tree_id: string; kind: "human" | "pet"; species: string | null;
  first_name: string; last_name: string; gender: "m" | "f" | "u";
  birth: string | null; death: string | null; origins: string[];
  parent_ids: string[]; spouse_ids: string[];
};
type Tree = { id: string; title: string; root_id: string | null; link_access: string };

const SPECIES: Record<string, string> = {
  chien: "🐶", chat: "🐱", oiseau: "🦜", poisson: "🐠", tortue: "🐢", cheval: "🐴", lapin: "🐰", autre: "🐾",
};
const flag = (c: string) =>
  c.length === 2 ? String.fromCodePoint(...[...c.toUpperCase()].map((x) => 127397 + x.charCodeAt(0))) : c;
const inp = "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm";
const btn = "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground";
const btn2 = "rounded-xl border border-line bg-card px-4 py-2 text-sm";

function generations(people: Person[], rootId: string | null): [number, Person[]][] {
  const by = new Map(people.map((p) => [p.id, p]));
  const root = rootId && by.has(rootId) ? rootId : people[0]?.id;
  if (!root) return [];
  const gen = new Map<string, number>([[root, 0]]);
  const queue = [root];
  while (queue.length) {
    const id = queue.shift()!;
    const g = gen.get(id)!;
    const p = by.get(id)!;
    const next: [string, number][] = [];
    p.parent_ids.forEach((x) => next.push([x, g - 1]));
    p.spouse_ids.forEach((x) => next.push([x, g]));
    people.forEach((c) => c.parent_ids.includes(id) && next.push([c.id, g + 1]));
    for (const [n, ng] of next) if (by.has(n) && !gen.has(n)) { gen.set(n, ng); queue.push(n); }
  }
  people.forEach((p) => !gen.has(p.id) && gen.set(p.id, 0));
  const rows = new Map<number, Person[]>();
  people.forEach((p) => rows.set(gen.get(p.id)!, [...(rows.get(gen.get(p.id)!) || []), p]));
  return [...rows.entries()].sort((a, b) => a[0] - b[0]);
}

function Auth() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const go = async (signUp: boolean) => {
    const r = signUp
      ? await supabase.auth.signUp({ email, password: pw })
      : await supabase.auth.signInWithPassword({ email, password: pw });
    setMsg(r.error ? r.error.message : signUp && !r.data.session ? "Vérifiez votre boîte mail pour confirmer votre compte." : "");
  };
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-serif text-5xl font-bold text-primary">Mon Arbre Généalogique</h1>
      <p className="mt-3 text-muted-foreground">L'histoire de votre famille, simplement et avec élégance.</p>
      <div className="mt-8 space-y-3">
        <input className={inp} type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inp} type="password" placeholder="Mot de passe (6 caractères min.)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <div className="flex gap-2">
          <button className={btn} onClick={() => go(false)}>Se connecter</button>
          <button className={btn2} onClick={() => go(true)}>Créer mon compte</button>
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </main>
  );
}

function Trees({ session, onOpen }: { session: Session; onOpen: (t: Tree) => void }) {
  const [list, setList] = useState<Tree[]>([]);
  const [title, setTitle] = useState("");
  const load = async () => {
    await supabase.rpc("claim_invites");
    const { data: m } = await supabase.from("tree_members").select("tree_id").eq("user_id", session.user.id);
    const ids = (m || []).map((x) => x.tree_id);
    if (!ids.length) return setList([]);
    const { data } = await supabase.from("trees").select("*").in("id", ids).order("created_at");
    setList((data as Tree[]) || []);
  };
  useEffect(() => { load(); }, []);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("trees").insert({ title: title || "Ma famille", owner_id: session.user.id }).select().single();
    if (error) return alert(error.message);
    onOpen(data as Tree);
  };
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-primary">Mes arbres</h1>
        <button className={btn2} onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </div>
      <div className="mt-6 space-y-2">
        {list.map((t) => (
          <button key={t.id} onClick={() => onOpen(t)} className="block w-full rounded-2xl border border-line bg-card px-5 py-4 text-left font-serif text-2xl">
            {t.title}
          </button>
        ))}
        {!list.length && <p className="text-muted-foreground">Vous n'avez pas encore d'arbre. Créez le premier ci-dessous.</p>}
      </div>
      <form onSubmit={create} className="mt-8 flex gap-2">
        <input className={inp} placeholder="Nom de l'arbre (ex : Famille Martin)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className={btn}>Créer</button>
      </form>
    </main>
  );
}

function TreeView({ tree, session, onBack }: { tree: Tree; session: Session | null; onBack: () => void }) {
  const [t, setT] = useState(tree);
  const [people, setPeople] = useState<Person[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [f, setF] = useState({ kind: "human", species: "chien", first_name: "", last_name: "", gender: "u", birth: "", death: "", origins: "", p1: "", p2: "", spouse: "" });
  const [inv, setInv] = useState({ email: "", role: "editor" });

  const load = async () => {
    const { data } = await supabase.from("people").select("*").eq("tree_id", tree.id).order("created_at");
    setPeople((data as Person[]) || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("people-" + tree.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "people", filter: `tree_id=eq.${tree.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tree.id]);
  useEffect(() => {
    if (!session) return;
    supabase.from("tree_members").select("role").eq("tree_id", tree.id).eq("user_id", session.user.id)
      .maybeSingle().then(({ data }) => setRole(data?.role ?? null));
  }, [tree.id, session]);

  const canEdit = (!!role && role !== "viewer") || (!!session && t.link_access === "edit");
  const canAdmin = role === "owner" || role === "co_lead";
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const row = {
      tree_id: tree.id, kind: f.kind, species: f.kind === "pet" ? f.species : null,
      first_name: f.first_name, last_name: f.last_name, gender: f.gender,
      birth: f.birth || null, death: f.death || null,
      origins: f.origins.split(/[ ,;]+/).filter(Boolean).map((s) => s.toUpperCase()),
      parent_ids: [f.p1, f.p2].filter(Boolean), spouse_ids: f.spouse ? [f.spouse] : [],
    };
    const { data, error } = await supabase.from("people").insert(row).select().single();
    if (error) return alert(error.message);
    const sp = people.find((p) => p.id === f.spouse);
    if (sp) await supabase.from("people").update({ spouse_ids: [...sp.spouse_ids, data.id] }).eq("id", sp.id);
    if (!t.root_id) {
      await supabase.from("trees").update({ root_id: data.id }).eq("id", tree.id);
      setT({ ...t, root_id: data.id });
    }
    setF({ ...f, first_name: "", last_name: "", birth: "", death: "", origins: "", p1: "", p2: "", spouse: "" });
    load();
  };
  const remove = async (p: Person) => {
    if (confirm(`Supprimer ${p.first_name} ${p.last_name} ?`)) { await supabase.from("people").delete().eq("id", p.id); load(); }
  };
  const makeRoot = async (id: string) => {
    await supabase.from("trees").update({ root_id: id }).eq("id", tree.id);
    setT({ ...t, root_id: id });
  };
  const setAccess = async (link_access: string) => {
    await supabase.from("trees").update({ link_access }).eq("id", tree.id);
    setT({ ...t, link_access });
  };
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tree_invites").insert({
      tree_id: tree.id, email: inv.email.trim().toLowerCase(), role: inv.role, invited_by: session!.user.id,
    });
    alert(error ? error.message : "Invitation enregistrée : la personne l'obtiendra en se connectant avec cet email.");
    setInv({ ...inv, email: "" });
  };

  const opt = (p: Person) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>;
  const humans = people.filter((p) => p.kind === "human");
  const label = (g: number) => (g === 0 ? "Votre génération" : g < 0 ? `${-g} génération${g < -1 ? "s" : ""} au-dessus` : `${g} génération${g > 1 ? "s" : ""} en dessous`);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <button className={btn2} onClick={onBack}>← Retour</button>
      <h1 className="mt-4 font-serif text-5xl font-bold text-primary">{t.title}</h1>

      <div className="mt-8 space-y-10">
        {generations(people, t.root_id).map(([g, row]) => (
          <section key={g}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label(g)}</h2>
            <div className="flex flex-wrap gap-4">
              {row.map((p) => (
                <article key={p.id} className={`w-44 rounded-2xl border bg-card p-4 text-center shadow-sm ${p.id === t.root_id ? "border-gold" : "border-line"}`}>
                  <div className="text-3xl">{p.kind === "pet" ? SPECIES[p.species || "autre"] : p.gender === "f" ? "👩" : p.gender === "m" ? "👨" : "🧑"}</div>
                  <h3 className="mt-1 font-serif text-xl font-bold leading-tight">{p.first_name} <span className="uppercase">{p.last_name}</span></h3>
                  <p className="text-xs text-muted-foreground">{[p.birth, p.death && "† " + p.death].filter(Boolean).join(" – ")}</p>
                  <p className="mt-1 text-lg">{p.origins.map(flag).join(" ")}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
                    {canAdmin && p.id !== t.root_id && <button className="underline" onClick={() => makeRoot(p.id)}>Racine</button>}
                    {canEdit && <button className="underline" onClick={() => remove(p)}>Supprimer</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!people.length && <p className="text-muted-foreground">Commencez par vous ajouter vous-même.</p>}
      </div>

      {canEdit && (
        <form onSubmit={add} className="mt-12 grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2">
          <h2 className="font-serif text-2xl font-bold sm:col-span-2">Ajouter une personne ou un animal</h2>
          <select className={inp} value={f.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="human">Une personne</option><option value="pet">Un animal de compagnie</option>
          </select>
          {f.kind === "pet" ? (
            <select className={inp} value={f.species} onChange={(e) => set("species", e.target.value)}>
              {Object.keys(SPECIES).map((s) => <option key={s} value={s}>{SPECIES[s]} {s}</option>)}
            </select>
          ) : (
            <select className={inp} value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="u">Genre : je ne sais pas</option><option value="f">Femme</option><option value="m">Homme</option>
            </select>
          )}
          <input required className={inp} placeholder="Prénom" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <input className={inp} placeholder="Nom" value={f.last_name} onChange={(e) => set("last_name", e.target.value)} />
          <input className={inp} placeholder="Naissance (ex : 12/03/1985)" value={f.birth} onChange={(e) => set("birth", e.target.value)} />
          <input className={inp} placeholder="Décès (si applicable)" value={f.death} onChange={(e) => set("death", e.target.value)} />
          <input className={inp + " sm:col-span-2"} placeholder="Pays d'origine, codes à 2 lettres (ex : FR, PT, MU)" value={f.origins} onChange={(e) => set("origins", e.target.value)} />
          <select className={inp} value={f.p1} onChange={(e) => set("p1", e.target.value)}>
            <option value="">{f.kind === "pet" ? "Foyer / maître" : "Parent 1 (facultatif)"}</option>{humans.map(opt)}
          </select>
          {f.kind === "human" && (
            <select className={inp} value={f.p2} onChange={(e) => set("p2", e.target.value)}>
              <option value="">Parent 2 (facultatif)</option>{humans.map(opt)}
            </select>
          )}
          {f.kind === "human" && (
            <select className={inp} value={f.spouse} onChange={(e) => set("spouse", e.target.value)}>
              <option value="">Conjoint(e) (facultatif)</option>{humans.map(opt)}
            </select>
          )}
          <button className={btn + " sm:col-span-2"}>Ajouter à l'arbre</button>
        </form>
      )}

      {canAdmin && (
        <section className="mt-8 space-y-4 rounded-2xl border border-line bg-card p-5">
          <h2 className="font-serif text-2xl font-bold">Partager</h2>
          <select className={inp} value={t.link_access} onChange={(e) => setAccess(e.target.value)}>
            <option value="private">Privé : invitations uniquement</option>
            <option value="view">Toute personne avec le lien peut voir</option>
            <option value="edit">Toute personne avec le lien connectée peut modifier</option>
          </select>
          {t.link_access !== "private" && (
            <input readOnly className={inp} value={`${location.origin}/?arbre=${t.id}`} onFocus={(e) => e.target.select()} />
          )}
          <form onSubmit={invite} className="flex flex-wrap gap-2">
            <input required type="email" className={inp + " flex-1"} placeholder="Email à inviter" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
            <select className={inp + " w-auto"} value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>
              <option value="viewer">Lecteur</option><option value="editor">Éditeur</option>
              {role === "owner" && <option value="co_lead">Chef adjoint</option>}
            </select>
            <button className={btn}>Inviter</button>
          </form>
        </section>
      )}
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tree, setTree] = useState<Tree | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("arbre");
    if (id) supabase.from("trees").select("*").eq("id", id).maybeSingle().then(({ data }) => data && setTree(data as Tree));
  }, []);

  if (!ready) return null;
  if (tree) return <TreeView tree={tree} session={session} onBack={() => { history.replaceState(null, "", "/"); setTree(null); }} />;
  if (!session) return <Auth />;
  return <Trees session={session} onOpen={setTree} />;
}
