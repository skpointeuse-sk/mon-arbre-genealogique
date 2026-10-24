import { useState, type FormEvent } from "react";
import { type Person, type Union, DATE_RE, SPECIES, country, fullName, lifespan, longDate, relatives, unionLabel } from "./lib";
import { Icon, Paw } from "./icons";

export type AddRel = "father" | "mother" | "spouse" | "sibling" | "child" | "pet";
export const ADD_LABEL: Record<AddRel, string> = { father: "Père", mother: "Mère", spouse: "Conjoint ou conjointe", sibling: "Frère ou sœur", child: "Enfant", pet: "Animal" };

const FIELDS: [keyof Person, string, string?][] = [
  ["first_name", "Prénom"], ["last_name", "Nom"],
  ["birth", "Date de naissance", "JJ/MM/AAAA, ou seulement l'année"], ["birth_time", "Heure de naissance"], ["birth_place", "Lieu de naissance"],
  ["death", "Date de décès", "Laisser vide si la personne est en vie"], ["job", "Métier"],
];

type Props = {
  p: Person; people: Person[]; unions: Union[]; rel: string; photo?: string; canEdit: boolean; isRoot: boolean;
  onClose: () => void; onGo: (id: string) => void; onCenter: () => void; onRoot: () => void;
  onSave: (d: Partial<Person>) => Promise<void>; onDelete: () => void; onPhoto: (f: File) => void;
  onAdd: (rel: AddRel) => void; onUnion: (a: string, b: string) => void;
};

export function PersonPanel(props: Props) {
  const { p, people, unions, rel, photo, canEdit, isRoot, onClose, onGo, onCenter, onRoot, onAdd, onUnion } = props;
  const [editing, setEditing] = useState(false);
  const r = relatives(people, p);
  const unionOf = (s: string) => unions.find((u) => (u.person_a === p.id && u.person_b === s) || (u.person_b === p.id && u.person_a === s));
  const human = p.kind === "human";

  const List = ({ title, items, extra }: { title: string; items: Person[]; extra?: (x: Person) => string }) =>
    items.length ? (
      <section className="kin">
        <h3>{title}</h3>
        <ul>
          {items.map((x) => (
            <li key={x.id}>
              <button className={`kin-item g-${x.kind === "pet" ? "pet" : x.gender}`} onClick={() => onGo(x.id)}>
                <span className="kin-name">{fullName(x)}</span>
                <span className="kin-meta">{[lifespan(x), extra?.(x)].filter(Boolean).join(", ")}</span>
                <Icon name="chevron" size={16} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <aside className="panel" aria-label={`Fiche de ${fullName(p)}`}>
      <div className="panel-grip" aria-hidden="true" />
      <header className="panel-head">
        <div className={`panel-face g-${human ? p.gender : "pet"}`}>
          {photo ? <img src={photo} alt={`Photo de ${fullName(p)}`} /> : human ? <span>{((p.first_name[0] ?? "") + (p.last_name[0] ?? "")).toUpperCase() || "?"}</span> : <Paw size={30} />}
        </div>
        <div className="panel-title">
          {rel && <p className="panel-rel">{rel}</p>}
          <h2>{p.first_name} <span className="surname">{p.last_name}</span></h2>
          <p className="panel-span">{lifespan(p)}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer la fiche"><Icon name="close" /></button>
      </header>

      {editing ? (
        <EditForm {...props} onDone={() => setEditing(false)} />
      ) : (
        <div className="panel-body">
          <div className="panel-actions">
            <button className="btn btn-quiet" onClick={onCenter}><Icon name="target" size={18} /> Centrer</button>
            {!isRoot && human && <button className="btn btn-quiet" onClick={onRoot}><Icon name="root" size={18} /> Partir de cette personne</button>}
            {canEdit && <button className="btn btn-primary" onClick={() => setEditing(true)}><Icon name="edit" size={18} /> Modifier</button>}
          </div>

          <dl className="facts">
            {!human && <><dt>Espèce</dt><dd>{SPECIES[p.species || "autre"] ?? p.species}</dd></>}
            {(p.birth || p.birth_place || p.birth_time) && <><dt>Naissance</dt><dd>{[longDate(p.birth), p.birth_time && `à ${p.birth_time}`, p.birth_place && `à ${p.birth_place}`].filter(Boolean).join(" ")}</dd></>}
            {p.death && <><dt>Décès</dt><dd>{longDate(p.death)}</dd></>}
            {p.job && <><dt>Métier</dt><dd>{p.job}</dd></>}
            {p.origins.length > 0 && <><dt>Origines</dt><dd>{p.origins.map(country).join(", ")}</dd></>}
          </dl>
          {!p.birth && !p.death && !p.job && !p.birth_place && !p.origins.length && human && (
            <p className="muted">Aucune date ni aucun lieu pour l'instant.{canEdit ? " Utilisez « Modifier » pour compléter la fiche." : ""}</p>
          )}
          {p.notes && <section className="notes"><h3>Souvenirs</h3><p>{p.notes}</p></section>}

          <List title={r.parents.length > 1 ? "Parents" : human ? "Parent" : "Famille"} items={r.parents} />
          {r.spouses.length > 0 && (
            <section className="kin">
              <h3>{r.spouses.length > 1 ? "Conjoints" : "Conjoint"}</h3>
              <ul>
                {r.spouses.map((s) => {
                  const u = unionOf(s.id);
                  return (
                    <li key={s.id} className="kin-pair">
                      <button className={`kin-item g-${s.gender}`} onClick={() => onGo(s.id)}>
                        <span className="kin-name">{fullName(s)}</span>
                        <span className="kin-meta">{lifespan(s)}</span>
                        <Icon name="chevron" size={16} />
                      </button>
                      <button className="kin-union" onClick={() => onUnion(p.id, s.id)}>
                        {u ? [unionLabel(u.type), longDate(u.date), u.place].filter(Boolean).join(", ") : canEdit ? "Préciser l'union" : "Union non renseignée"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <List title="Enfants" items={r.children} />
          <List title="Frères et sœurs" items={r.siblings} />
          <List title="Animaux" items={r.pets} extra={(x) => SPECIES[x.species || "autre"] ?? ""} />

          {canEdit && human && (
            <section className="add">
              <h3>Ajouter à partir de {p.first_name || "cette personne"}</h3>
              <div className="add-grid">
                {(Object.keys(ADD_LABEL) as AddRel[])
                  .filter((k) => !((k === "father" || k === "mother") && r.parents.filter((x) => x.kind === "human").length >= 2))
                  .filter((k) => k !== "sibling" || p.parent_ids.length > 0)
                  .map((k) => <button key={k} className="btn btn-quiet" onClick={() => onAdd(k)}><Icon name="plus" size={16} /> {ADD_LABEL[k]}</button>)}
              </div>
              {!p.parent_ids.length && <p className="muted small">Pour ajouter un frère ou une sœur, ajoutez d'abord un parent.</p>}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}

function EditForm({ p, photo, canEdit, onSave, onDelete, onPhoto, onDone }: Props & { onDone: () => void }) {
  const [d, setD] = useState<Record<string, string>>({
    ...Object.fromEntries(FIELDS.map(([k]) => [k, (p[k] as string | null) ?? ""])),
    origins: p.origins.join(", "), gender: p.gender, notes: p.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!d.first_name.trim() && !d.last_name.trim()) er.first_name = "Indiquez au moins un prénom ou un nom.";
    for (const k of ["birth", "death"]) if (d[k].trim() && !DATE_RE.test(d[k].trim())) er[k] = "Format attendu : JJ/MM/AAAA, MM/AAAA ou AAAA (avec « vers » si la date est approximative).";
    const origins = d.origins.split(/[ ,;]+/).filter(Boolean).map((s) => (s.length === 2 ? s.toUpperCase() : s));
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const val = (k: string) => d[k].trim() || null;
    await onSave({
      first_name: d.first_name.trim(), last_name: d.last_name.trim(),
      birth: val("birth"), birth_time: val("birth_time"), birth_place: val("birth_place"), death: val("death"), job: val("job"),
      gender: d.gender as Person["gender"], notes: d.notes.trim() || null, origins,
    });
    setBusy(false);
    onDone();
  };

  return (
    <form className="panel-body edit" onSubmit={submit} noValidate>
      <div className="photo-row">
        <span>{photo ? "Photo enregistrée" : "Aucune photo"}</span>
        {canEdit && (
          <label className="btn btn-quiet">
            <Icon name="camera" size={18} /> {photo ? "Changer la photo" : "Ajouter une photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
          </label>
        )}
      </div>
      {FIELDS.map(([k, l, hint]) => (
        <label key={k} className="field">
          <span>{l}</span>
          <input value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} aria-invalid={!!errors[k] || undefined}
            inputMode={k === "birth" || k === "death" ? "numeric" : undefined} />
          {errors[k] ? <small className="form-error">{errors[k]}</small> : hint ? <small>{hint}</small> : null}
        </label>
      ))}
      <label className="field">
        <span>Pays d'origine</span>
        <input value={d.origins} onChange={(e) => setD({ ...d, origins: e.target.value })} aria-invalid={!!errors.origins || undefined} />
        {errors.origins ? <small className="form-error">{errors.origins}</small> : <small>Codes à deux lettres séparés par une virgule : FR, PT, MU</small>}
      </label>
      <label className="field">
        <span>Genre</span>
        <select value={d.gender} onChange={(e) => setD({ ...d, gender: e.target.value })}>
          <option value="u">Non précisé</option><option value="f">Femme</option><option value="m">Homme</option>
        </select>
      </label>
      <label className="field">
        <span>Souvenirs, anecdotes</span>
        <textarea rows={5} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onDone}>Annuler</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
      <button type="button" className="btn btn-danger-quiet" onClick={onDelete}><Icon name="trash" size={18} /> Supprimer {p.first_name || "cette personne"} de l'arbre</button>
    </form>
  );
}
