import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Modal, frError } from "./ui";
import { ROLE_LABEL } from "./members";

type Event = { id: number; user_id: string | null; at: string; kind: string; target: string; label: string; fields: string[] };

const FIELD: Record<string, string> = {
  first_name: "prénom",
  last_name: "nom",
  nickname: "surnom",
  gender: "genre",
  birth: "naissance",
  birth_time: "heure de naissance",
  birth_place: "lieu de naissance",
  death: "décès",
  death_place: "lieu de décès",
  burial: "inhumation",
  job: "métier",
  origins: "origines",
  photo_path: "photo",
  audio_path: "souvenir vocal",
  notes: "notes",
  parent_ids: "parents",
  spouse_ids: "conjoints",
  species: "espèce",
  type: "type d'union",
  date: "date",
  place: "lieu",
  title: "titre",
  root_id: "personne centrale",
  settings: "ambiance",
  link_access: "accès par lien",
};

/* Une phrase par événement, au passé, comme on le raconterait. */
export function describe(e: Event) {
  const who = e.label || "Sans nom";
  const what = e.fields.map((f) => FIELD[f]).filter(Boolean);
  if (e.target === "personne")
    return e.kind === "ajout"
      ? `a ajouté ${who}`
      : e.kind === "suppression"
        ? `a retiré ${who}`
        : `a modifié ${who}${what.length ? ` (${what.join(", ")})` : ""}`;
  if (e.target === "union")
    return e.kind === "ajout"
      ? `a renseigné l'union de ${who}`
      : e.kind === "suppression"
        ? `a retiré l'union de ${who}`
        : `a modifié l'union de ${who}`;
  if (e.target === "membre") {
    const r = ROLE_LABEL[e.fields[0]]?.toLowerCase() ?? "";
    return e.kind === "ajout"
      ? `a ajouté ${who} aux membres (${r})`
      : e.kind === "suppression"
        ? `a retiré ${who} des membres`
        : `a passé ${who} en « ${r} »`;
  }
  return `a changé ${what.join(", ") || "les réglages de l'arbre"}`;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function HistoryDialog({ treeId, me, onClose }: { treeId: string; me: string; onClose: () => void }) {
  const [list, setList] = useState<Event[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tree_events")
        .select("id, user_id, at, kind, target, label, fields")
        .eq("tree_id", treeId)
        .order("at", { ascending: false })
        .limit(150);
      if (error) return setErr(frError(error.message));
      const ids = [...new Set((data ?? []).map((e) => e.user_id).filter((x): x is string => !!x))];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
        setNames(new Map((profs ?? []).map((p) => [p.id, p.display_name || p.email?.split("@")[0] || "Un membre"])));
      }
      setList(data ?? []);
    })();
  }, [treeId]);
  const author = (id: string | null) => (id === me ? "Vous" : id ? (names.get(id) ?? "Un ancien membre") : "L'application");
  return (
    <Modal title="Historique des modifications" onClose={onClose} wide>
      {err ? (
        <p className="form-error" role="alert">
          {err}
        </p>
      ) : !list ? (
        <p className="muted">Chargement…</p>
      ) : !list.length ? (
        <p className="muted">Aucune modification enregistrée pour l'instant. L'historique démarre le 24 octobre 2026.</p>
      ) : (
        <ul className="events history">
          {list.map((e) => (
            <li key={e.id}>
              <span>
                <strong>{author(e.user_id)}</strong> {describe(e)}
              </span>
              <span className="kin-meta">{when(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
