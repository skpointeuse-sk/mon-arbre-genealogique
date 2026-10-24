import { useState, type FormEvent } from "react";
import { type Person, type Tree, type Union, DATE_RE, SPECIES, UNIONS, upcoming, fullName } from "./lib";
import { Modal } from "./ui";
import { checkFamily } from "./check";
import { type Depth, type ExportOpts, type Format, type View, FORMAT_LABEL } from "./exporting";
import { ADD_LABEL, type AddRel } from "./Panel";
import { Members } from "./members";

export function AddDialog({
  rel,
  of,
  onClose,
  onSubmit,
}: {
  rel: AddRel;
  of: Person;
  onClose: () => void;
  onSubmit: (name: string, species: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("chien");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(rel === "pet" ? "Indiquez le nom de l'animal." : "Indiquez au moins un prénom.");
    setBusy(true);
    await onSubmit(name, species);
    setBusy(false);
  };
  return (
    <Modal title={`${ADD_LABEL[rel]} de ${of.first_name || fullName(of)}`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <label className="field">
          <span>{rel === "pet" ? "Nom de l'animal" : "Prénom et nom"}</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err || undefined} />
          {err ? (
            <small className="form-error">{err}</small>
          ) : rel !== "pet" && rel !== "spouse" && rel !== "mother" ? (
            <small>Sans nom de famille, celui de {of.first_name} sera repris.</small>
          ) : null}
        </label>
        {rel === "pet" && (
          <label className="field">
            <span>Espèce</span>
            <select value={species} onChange={(e) => setSpecies(e.target.value)}>
              {Object.entries(SPECIES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Ajout…" : "Ajouter à l'arbre"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function UnionDialog({
  a,
  b,
  existing,
  canEdit,
  onClose,
  onSave,
}: {
  a: Person;
  b: Person;
  existing?: Union;
  canEdit: boolean;
  onClose: () => void;
  onSave: (d: { type: string; date: string; place: string; notes: string }) => Promise<boolean>;
}) {
  const [d, setD] = useState({
    type: existing?.type ?? "mariage",
    date: existing?.date ?? "",
    place: existing?.place ?? "",
    notes: existing?.notes ?? "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (d.date.trim() && !DATE_RE.test(d.date.trim())) return setErr("Format attendu : JJ/MM/AAAA, MM/AAAA ou AAAA.");
    setBusy(true);
    const ok = await onSave(d);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal title={`Union de ${a.first_name} et ${b.first_name}`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <fieldset className="stack" disabled={!canEdit}>
          <label className="field">
            <span>Type d'union</span>
            <select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })}>
              {UNIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input
              value={d.date}
              placeholder="JJ/MM/AAAA"
              onChange={(e) => setD({ ...d, date: e.target.value })}
              aria-invalid={!!err || undefined}
            />
            {err && <small className="form-error">{err}</small>}
          </label>
          <label className="field">
            <span>Lieu de la cérémonie</span>
            <input value={d.place} onChange={(e) => setD({ ...d, place: e.target.value })} />
          </label>
          <label className="field">
            <span>Témoins, souvenirs</span>
            <textarea rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
          </label>
        </fieldset>
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            {canEdit ? "Annuler" : "Fermer"}
          </button>
          {canEdit && (
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function CalendarDialog({
  people,
  unions,
  onClose,
  onGo,
}: {
  people: Person[];
  unions: Union[];
  onClose: () => void;
  onGo: (id: string) => void;
}) {
  const list = upcoming(people, unions);
  return (
    <Modal title="Prochains anniversaires" onClose={onClose}>
      {list.length ? (
        <ol className="events">
          {list.map((e, i) => (
            <li key={i}>
              <time>{e.d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</time>
              {e.id ? (
                <button className="link" onClick={() => onGo(e.id!)}>
                  {e.label}
                </button>
              ) : (
                <span>{e.label}</span>
              )}
              <span className="muted">{e.kind === "union" ? `${e.n} ans d'union` : `${e.n} ans`}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Aucune date complète pour l'instant. Ajoutez des dates de naissance au format JJ/MM/AAAA dans les fiches.</p>
      )}
    </Modal>
  );
}

export function ShareDialog({
  tree,
  role,
  onClose,
  onAccess,
  onInvite,
  me,
}: {
  tree: Tree;
  role: string | null;
  me: string;
  onClose: () => void;
  onAccess: (v: string) => void;
  onInvite: (email: string, role: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [r, setR] = useState("editor");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(0);
  const link = `${location.origin}/partage/${tree.id}`;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Saisissez une adresse email valide.");
    setErr("");
    setBusy(true);
    if (await onInvite(email, r)) {
      setEmail("");
      setSent((n) => n + 1);
    }
    setBusy(false);
  };
  return (
    <Modal title="Partager l'arbre" onClose={onClose} wide>
      <div className="stack">
        <label className="field">
          <span>Accès par lien</span>
          <select value={tree.link_access} onChange={(e) => onAccess(e.target.value)}>
            <option value="private">Privé : sur invitation uniquement</option>
            <option value="view">Toute personne avec le lien peut voir</option>
            <option value="edit">Toute personne connectée avec le lien peut modifier</option>
          </select>
          {tree.link_access === "edit" && (
            <small>
              Attention : n'importe qui peut créer un compte. Ce réglage permet à toute personne qui a le lien de modifier l'arbre.
            </small>
          )}
        </label>
        {tree.link_access !== "private" && (
          <div className="row-input">
            <label className="field grow">
              <span>Lien à envoyer</span>
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true))}
            >
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
        )}
        <form className="stack invite" onSubmit={submit} noValidate>
          <h3>Inviter une personne</h3>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err || undefined} />
            {err && <small className="form-error">{err}</small>}
          </label>
          <label className="field">
            <span>Droits</span>
            <select value={r} onChange={(e) => setR(e.target.value)}>
              <option value="viewer">Lecture seule</option>
              <option value="editor">Peut modifier</option>
              {role === "owner" && <option value="co_lead">Co-administrateur</option>}
            </select>
          </label>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Envoi…" : "Inviter"}
          </button>
          <small className="muted">La personne verra l'arbre en se connectant avec cet email.</small>
        </form>
        <Members treeId={tree.id} role={role} me={me} refresh={sent} />
      </div>
    </Modal>
  );
}

export function CheckDialog({
  people,
  unions,
  onClose,
  onGo,
}: {
  people: Person[];
  unions: Union[];
  onClose: () => void;
  onGo: (id: string) => void;
}) {
  const list = checkFamily(people, unions);
  return (
    <Modal title="Vérifier les dates" onClose={onClose}>
      {list.length ? (
        <>
          <p className="muted">
            Quelques dates méritent un second regard. Ce ne sont pas forcément des erreurs : cliquez sur un nom pour ouvrir la fiche.
          </p>
          <ul className="events">
            {list.map((a, i) => (
              <li key={i}>
                <button className="link" onClick={() => onGo(a.id)}>
                  {a.text}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Rien à signaler : les dates de l'arbre sont cohérentes entre elles.</p>
      )}
    </Modal>
  );
}

const DEPTHS: [Depth, string][] = [
  [3, "Jusqu'aux grands-parents et petits-enfants"],
  [4, "Jusqu'aux arrière-grands-parents et arrière-petits-enfants"],
  [0, "Tout l'arbre"],
];
const VIEWS: [View, string][] = [
  ["all", "Toute la famille"],
  ["up", "Les ancêtres seulement"],
  ["down", "Les descendants seulement"],
];

export function ExportDialog({
  rootName,
  onClose,
  onExport,
}: {
  rootName: string;
  onClose: () => void;
  onExport: (o: ExportOpts) => Promise<void>;
}) {
  const [o, setO] = useState<ExportOpts>({ depth: 0, view: "all", format: "png", scene: true });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onExport(o);
    setBusy(false);
  };
  return (
    <Modal title="Exporter l'arbre" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <fieldset className="choice">
          <legend>Jusqu'où</legend>
          {DEPTHS.map(([k, l]) => (
            <label key={k} className="choice-item">
              <input type="radio" name="depth" checked={o.depth === k} onChange={() => setO({ ...o, depth: k })} /> {l}
            </label>
          ))}
        </fieldset>
        <fieldset className="choice">
          <legend>Autour de {rootName}</legend>
          {VIEWS.map(([k, l]) => (
            <label key={k} className="choice-item">
              <input type="radio" name="view" checked={o.view === k} onChange={() => setO({ ...o, view: k })} /> {l}
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span>Format</span>
          <select value={o.format} onChange={(e) => setO({ ...o, format: e.target.value as Format })}>
            {Object.entries(FORMAT_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="choice-item">
          <input type="checkbox" checked={o.scene} onChange={(e) => setO({ ...o, scene: e.target.checked })} /> Garder le paysage en fond
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Préparation…" : "Télécharger"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
