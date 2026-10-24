import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "./supabase";
import { useSession } from "./session";
import { Mark } from "./icons";
import { frError } from "./ui";

/* Arrivée depuis l'e-mail « Mot de passe oublié » : le lien ouvre une session temporaire,
   on demande le nouveau mot de passe puis on ouvre l'arbre. */
export function RecoveryPage() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setErr("Le mot de passe doit contenir au moins 6 caractères.");
    if (pw !== pw2) return setErr("Les deux mots de passe ne sont pas identiques.");
    setErr("");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(frError(error.message));
    navigate({ to: "/arbre" });
  };
  return (
    <div className="legal">
      <header className="legal-bar">
        <a className="legal-home" href="/">
          <Mark size={26} />
          <span>Mon Arbre Généalogique</span>
        </a>
      </header>
      <main className="legal-main">
        <h1>Nouveau mot de passe</h1>
        {!ready ? (
          <p className="muted" role="status">
            Vérification du lien…
          </p>
        ) : !session ? (
          <p>
            Ce lien a expiré ou a déjà servi. Retournez à l'accueil, choisissez « Se connecter », puis « Mot de passe oublié ? » pour en
            recevoir un nouveau.
          </p>
        ) : (
          <form className="stack auth-recover" onSubmit={submit} noValidate>
            <label className="field">
              <span>
                Nouveau mot de passe <small>(6 caractères minimum)</small>
              </span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                aria-invalid={!!err || undefined}
              />
            </label>
            <label className="field">
              <span>Le même, une seconde fois</span>
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                aria-invalid={!!err || undefined}
              />
            </label>
            {err && (
              <p className="form-error" role="alert">
                {err}
              </p>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer et ouvrir mon arbre"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
