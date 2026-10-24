import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { type NewPerson, type Person, split, uid } from "./lib";
import { frError, useUi } from "./ui";
import { Icon, Mark } from "./icons";

function ListEditor({ items, set, label }: { items: string[]; set: (x: string[]) => void; label: string }) {
  return (
    <div className="stack">
      {items.map((x, i) => (
        <div className="row-input" key={i}>
          <label className="field grow"><span>{label} {i + 1}</span>
            <input value={x} autoFocus={i === items.length - 1} onChange={(e) => set(items.map((y, j) => (j === i ? e.target.value : y)))} />
          </label>
          <button type="button" className="icon-btn" aria-label={`Retirer ${label.toLowerCase()} ${i + 1}`} onClick={() => set(items.filter((_, j) => j !== i))}><Icon name="close" /></button>
        </div>
      ))}
      <button type="button" className="btn btn-quiet" onClick={() => set([...items, ""])}><Icon name="plus" size={18} /> Ajouter {items.length ? "une autre personne" : "une personne"}</button>
    </div>
  );
}

const TITLES = ["Commençons par vous.", "Vos parents.", "Vos frères et sœurs.", "Vos grands-parents.", "Vos enfants.", "Votre conjoint ou conjointe."];
const HINTS = [
  "Votre prénom et votre nom suffisent.",
  "Seulement ceux que vous connaissez : prénom et nom.",
  "Vous pouvez passer cette étape.",
  "Remplissez seulement ceux que vous connaissez.",
  "Vous pourrez en ajouter d'autres plus tard.",
  "Dernière étape. Votre arbre sera prêt juste après.",
];

export function Wizard({ session, onDone }: { session: Session; onDone: () => void }) {
  const { say } = useUi();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Record<string, string>>({ gender: "u" });
  const [sibs, setSibs] = useState<string[]>([]);
  const [kids, setKids] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const f = (k: string, label: string) => (
    <label className="field"><span>{label}</span><input value={v[k] || ""} autoComplete="off" onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );

  const finish = async () => {
    if (!v.me?.trim()) { setStep(0); return setErr("Indiquez au moins votre prénom pour créer l'arbre."); }
    setBusy(true);
    const me = split(v.me);
    const { data: t, error } = await supabase.from("trees").insert({ title: `Famille ${me.last_name || me.first_name}`, owner_id: session.user.id }).select().single();
    if (error) { setBusy(false); return say(frError(error.message), "error"); }
    const rows: NewPerson[] = [];
    const mk = (name: string | undefined, gender: Person["gender"], def = ""): NewPerson | null => {
      if (!name?.trim()) return null;
      const r: NewPerson = { id: uid(), tree_id: t.id, kind: "human", gender, origins: [], parent_ids: [], spouse_ids: [], ...split(name, def) };
      rows.push(r);
      return r;
    };
    const up = (parent: NewPerson | null, a?: string, b?: string, label = "", g: Person["gender"] = "u") => {
      const ga = mk(a, "m", parent?.last_name ?? ""), gb = mk(b, "f");
      if (!ga && !gb) return parent;
      const p = (parent ?? mk(label, g))!;
      p.parent_ids = [ga, gb].filter((x): x is NewPerson => !!x).map((x) => x.id);
      if (ga && gb) { ga.spouse_ids = [gb.id]; gb.spouse_ids = [ga.id]; }
      return p;
    };
    // v.me est vérifié en tête de fonction : la personne racine existe toujours.
    const meR = mk(v.me, v.gender as Person["gender"])!;
    let fa = mk(v.father, "m", me.last_name), mo = mk(v.mother, "f");
    fa = up(fa, v.pf, v.pm, "Père", "m");
    mo = up(mo, v.mf, v.mm, "Mère", "f");
    const par = [fa, mo].filter((x): x is NewPerson => !!x).map((x) => x.id);
    if (fa && mo) { fa.spouse_ids = [mo.id]; mo.spouse_ids = [fa.id]; }
    meR.parent_ids = par;
    sibs.forEach((s) => { const r = mk(s, "u", me.last_name); if (r) r.parent_ids = par; });
    const sp = mk(v.spouse, "u");
    if (sp) { sp.spouse_ids = [meR.id]; meR.spouse_ids = [sp.id]; }
    kids.forEach((k) => { const r = mk(k, "u", me.last_name); if (r) r.parent_ids = [meR.id, ...(sp ? [sp.id] : [])]; });
    const { error: e2 } = await supabase.from("people").insert(rows);
    if (e2) { setBusy(false); return say(frError(e2.message), "error"); }
    await supabase.from("trees").update({ root_id: meR.id }).eq("id", t.id);
    onDone();
  };

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (step === 0 && !v.me?.trim()) return setErr("Indiquez au moins votre prénom pour continuer.");
    setErr("");
    if (step === 5) finish(); else setStep(step + 1);
  };

  const body = [
    <div className="stack" key="0">
      <label className="field"><span>Votre prénom et votre nom</span>
        <input autoFocus value={v.me || ""} autoComplete="name" aria-invalid={!!err || undefined} onChange={(e) => setV({ ...v, me: e.target.value })} />
      </label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <fieldset className="choice">
        <legend>Vous êtes</legend>
        {[["f", "une femme"], ["m", "un homme"], ["u", "je préfère ne pas le préciser"]].map(([g, l]) => (
          <label key={g} className="choice-item"><input type="radio" name="gender" checked={v.gender === g} onChange={() => setV({ ...v, gender: g })} /> {l}</label>
        ))}
      </fieldset>
    </div>,
    <div className="stack" key="1">{f("father", "Père : prénom et nom")}{f("mother", "Mère : prénom et nom")}</div>,
    <ListEditor key="2" items={sibs} set={setSibs} label="Frère ou sœur" />,
    <div className="grid-2" key="3">{f("pf", "Grand-père paternel")}{f("pm", "Grand-mère paternelle")}{f("mf", "Grand-père maternel")}{f("mm", "Grand-mère maternelle")}</div>,
    <ListEditor key="4" items={kids} set={setKids} label="Enfant" />,
    <div key="5">{f("spouse", "Prénom et nom de votre conjoint ou conjointe")}</div>,
  ][step];

  return (
    <div className="wizard">
      <header className="landing-bar">
        <span className="brand"><Mark /> Mon arbre généalogique</span>
        <button className="link" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
      </header>
      <form className="wizard-main" onSubmit={next}>
        <ol className="steps" aria-label={`Étape ${step + 1} sur 6`}>
          {TITLES.map((t, i) => <li key={i} className={i < step ? "done" : i === step ? "current" : ""} aria-current={i === step ? "step" : undefined}><span className="sr">{t}</span></li>)}
        </ol>
        <p className="step-count">Étape {step + 1} sur 6</p>
        <h1>{TITLES[step]}</h1>
        <p className="lede">{HINTS[step]}</p>
        <div className="wizard-body">{body}</div>
        <div className="wizard-nav">
          <button type="button" className="btn btn-quiet" disabled={!step || busy} onClick={() => setStep(step - 1)}><Icon name="back" size={18} /> Retour</button>
          <span className="grow" />
          {step > 0 && step < 5 && <button type="button" className="link" onClick={() => setStep(step + 1)}>Passer</button>}
          <button className="btn btn-primary" disabled={busy}>{step === 5 ? (busy ? "Création en cours…" : "Créer mon arbre") : "Continuer"}</button>
        </div>
      </form>
    </div>
  );
}
