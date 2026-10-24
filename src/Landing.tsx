import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";
import { frError } from "./ui";
import { Mark } from "./icons";
import { PersonCard } from "./card";
import type { Person } from "./lib";
import { Scene } from "./scenes";
import { AMBIANCES, saveAmbiance, savedAmbiance } from "./themes";

/* Personnes fictives de démonstration (déjà présentes dans l'ancienne page d'accueil). */
const demo = (
  id: string,
  first: string,
  last: string,
  gender: Person["gender"],
  birth: string | null,
  death: string | null,
  origins: string[],
): Person => ({
  id,
  tree_id: "demo",
  kind: "human",
  species: null,
  first_name: first,
  last_name: last,
  gender,
  birth,
  birth_time: null,
  birth_place: null,
  death,
  job: null,
  notes: null,
  photo_path: null,
  origins,
  parent_ids: [],
  spouse_ids: [],
});
const DEMO = {
  henri: demo("d1", "Henri", "Martin", "m", "1931", "2009", ["FR"]),
  jeanne: demo("d2", "Jeanne", "Martin", "f", "1934", null, ["FR"]),
  sophie: demo("d3", "Sophie", "Martin", "f", "1961", null, ["PT"]),
  paul: demo("d4", "Paul", "Martin", "m", "1958", null, ["FR"]),
  lucas: demo("d5", "Lucas", "Martin", "m", "1988", null, ["FR", "MU"]),
};

export function Landing() {
  const [mode, setMode] = useState<"up" | "in">("up");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [amb, setAmb] = useState(savedAmbiance);
  const choose = (k: string) => {
    setAmb(k);
    saveAmbiance(k);
  };

  const go = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: "Saisissez une adresse email valide." });
    if (pw.length < 6) return setMsg({ text: "Le mot de passe doit contenir au moins 6 caractères." });
    setBusy(true);
    setMsg(null);
    const r =
      mode === "up"
        ? await supabase.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: location.origin + "/" } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (r.error) return setMsg({ text: frError(r.error.message) });
    if (mode === "up" && !r.data.session)
      setMsg({ ok: true, text: "Compte créé. Ouvrez le lien reçu par email pour le confirmer, puis connectez-vous ici." });
  };

  // Même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
  const forgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMsg({ text: "Saisissez d'abord votre adresse email, puis cliquez à nouveau." });
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + "/nouveau-mot-de-passe" });
    setBusy(false);
    if (error && !/rate|too many/i.test(error.message)) return setMsg({ text: frError(error.message) });
    setMsg(
      error
        ? { text: frError(error.message) }
        : {
            ok: true,
            text: "Si un compte existe avec cette adresse, un e-mail vient de partir. Ouvrez le lien qu'il contient pour choisir un nouveau mot de passe.",
          },
    );
  };

  return (
    <div className="landing" data-ambiance={amb}>
      <Scene id={amb} className="scene-fixed" />
      <header className="landing-bar">
        <span className="brand">
          <Mark /> Mon Arbre Généalogique
        </span>
        <button
          className="link"
          onClick={() => {
            setMode(mode === "up" ? "in" : "up");
            setMsg(null);
            document.getElementById("acces")?.scrollIntoView({ block: "center" });
          }}
        >
          {mode === "up" ? "Se connecter" : "Créer un compte"}
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-intro">
          <h1>Dessinez l'arbre de votre famille, puis complétez-le ensemble.</h1>
          <p className="lede">
            Six questions suffisent pour poser les trois premières générations. Ensuite, chacun ajoute ce qu'il sait : dates, lieux, photos,
            unions. Invitez vos proches et choisissez qui peut lire ou modifier.
          </p>

          <form id="acces" className="auth" onSubmit={go} noValidate>
            <div className="auth-tabs" role="tablist" aria-label="Accès">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "up"}
                onClick={() => {
                  setMode("up");
                  setMsg(null);
                }}
              >
                Créer un compte
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "in"}
                onClick={() => {
                  setMode("in");
                  setMsg(null);
                }}
              >
                Se connecter
              </button>
            </div>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={msg && !msg.ok ? true : undefined}
              />
            </label>
            <label className="field">
              <span>Mot de passe{mode === "up" && <small> (6 caractères minimum)</small>}</span>
              <input
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </label>
            {msg && (
              <p className={msg.ok ? "form-ok" : "form-error"} role="alert">
                {msg.text}
              </p>
            )}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Un instant…" : mode === "up" ? "Créer mon arbre" : "Ouvrir mon arbre"}
            </button>
            {mode === "in" && (
              <button type="button" className="link auth-forgot" onClick={forgot} disabled={busy}>
                Mot de passe oublié ?
              </button>
            )}
          </form>
        </section>

        <figure className="landing-demo" aria-label="Exemple d'arbre avec trois générations fictives">
          <fieldset className="amb-pick">
            <legend>Essayez une ambiance</legend>
            {Object.entries(AMBIANCES).map(([k, a]) => (
              <label key={k} className={k === amb ? "on" : ""}>
                <input type="radio" name="ambiance" value={k} checked={k === amb} onChange={() => choose(k)} />
                <span className="amb-swatch" data-ambiance={k} aria-hidden="true" />
                {a.name}
              </label>
            ))}
          </fieldset>
          <div className="demo-cards">
            <svg className="demo-lines" viewBox="0 0 428 378" aria-hidden="true">
              <path d="M196 52 H232 M214 52 V126 H98 V152" />
              <path d="M196 194 H232 M214 194 V294" />
            </svg>
            <PersonCard p={DEMO.henri} rel="Grand-père" style={{ left: 0, top: 10 }} />
            <PersonCard p={DEMO.jeanne} rel="Grand-mère" style={{ left: 232, top: 10 }} />
            <PersonCard p={DEMO.paul} rel="Père" style={{ left: 0, top: 152 }} />
            <PersonCard p={DEMO.sophie} rel="Mère" style={{ left: 232, top: 152 }} />
            <PersonCard p={DEMO.lucas} rel="Vous" root style={{ left: 116, top: 294 }} />
          </div>
          <figcaption>Exemple fictif. Chaque carte s'ouvre sur une fiche : dates, lieux, métier, photo, souvenirs.</figcaption>
        </figure>
      </main>

      <footer className="landing-foot">
        <p>Vos données restent privées : un arbre n'est visible que par les personnes invitées, ou par lien si vous l'activez.</p>
        <p className="legal-links">
          <a href="/confidentialite">Confidentialité</a>
          <a href="/mentions-legales">Mentions légales</a>
        </p>
      </footer>
    </div>
  );
}
