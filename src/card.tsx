import { type Person, lifespan } from "./lib";
import { Paw } from "./icons";

/* Carte d'une personne dans l'arbre. Le texte vient des données : React l'échappe. */
export function PersonCard({
  p,
  rel,
  photo,
  root,
  selected,
  dim,
  onSelect,
  style,
}: {
  p: Person;
  rel: string;
  photo?: string;
  root?: boolean;
  selected?: boolean;
  dim?: boolean;
  onSelect?: () => void;
  style?: React.CSSProperties;
}) {
  const initials = ((p.first_name[0] ?? "") + (p.last_name[0] ?? "")).toUpperCase() || "?";
  const cls = [
    "card",
    `g-${p.kind === "pet" ? "pet" : p.gender}`,
    root && "is-root",
    selected && "is-selected",
    dim && "is-dim",
    p.death && "is-deceased",
  ]
    .filter(Boolean)
    .join(" ");
  const span = lifespan(p);
  return (
    <button
      type="button"
      className={cls}
      style={style}
      data-person-id={p.id}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${p.first_name} ${p.last_name}${rel ? ", " + rel : ""}${span ? ", " + span : ""}`}
    >
      <span className="card-face" aria-hidden="true">
        {photo ? <img src={photo} alt="" draggable={false} /> : p.kind === "pet" ? <Paw /> : <span>{initials}</span>}
      </span>
      <span className="card-text">
        <span className="card-first">{p.first_name || "Sans prénom"}</span>
        {p.last_name && <span className="card-last">{p.last_name}</span>}
        {span && <span className="card-meta">{span}</span>}
      </span>
      {rel && <span className="card-rel">{rel}</span>}
      {p.origins.length > 0 && (
        <span className="card-origins" title="Origines">
          {p.origins.join(" ")}
        </span>
      )}
    </button>
  );
}
