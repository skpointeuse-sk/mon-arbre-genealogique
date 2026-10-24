import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { frError, useUi } from "./ui";

export const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  co_lead: "Co-administrateur",
  editor: "Peut modifier",
  viewer: "Lecture seule",
};

type Member = { user_id: string; role: string; name: string; email: string };
type Invite = { id: string; email: string; role: string };

/* Ce que l'on peut faire d'un membre : mêmes règles que les politiques RLS de tree_members.
   Le serveur refuse de toute façon le reste. */
export function rolesFor(me: string | null, target: string): string[] {
  if (target === "owner") return [];
  if (me === "owner") return ["co_lead", "editor", "viewer"];
  if (me === "co_lead" && (target === "editor" || target === "viewer")) return ["editor", "viewer"];
  return [];
}

export function Members({ treeId, role, me, refresh }: { treeId: string; role: string | null; me: string; refresh: number }) {
  const { say, ask } = useUi();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: rows, error } = await supabase.from("tree_members").select("user_id, role").eq("tree_id", treeId);
      if (error) return say(frError(error.message), "error");
      const ids = (rows ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, display_name, email").in("id", ids)
        : { data: [] as { id: string; display_name: string | null; email: string | null }[] };
      const by = new Map((profs ?? []).map((p) => [p.id, p]));
      const order = ["owner", "co_lead", "editor", "viewer"];
      const list = (rows ?? [])
        .map((r) => ({
          user_id: r.user_id,
          role: r.role,
          name: by.get(r.user_id)?.display_name || by.get(r.user_id)?.email?.split("@")[0] || "Membre",
          email: by.get(r.user_id)?.email ?? "",
        }))
        .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name, "fr"));
      const { data: inv } = await supabase.from("tree_invites").select("id, email, role").eq("tree_id", treeId);
      if (!live) return;
      setMembers(list);
      setInvites(inv ?? []);
    })();
    return () => {
      live = false;
    };
  }, [treeId, refresh, tick, say]);

  const setRole = async (m: Member, r: string) => {
    const { error } = await supabase.from("tree_members").update({ role: r }).eq("tree_id", treeId).eq("user_id", m.user_id);
    if (error) return say(frError(error.message), "error");
    say(`${m.name} : ${ROLE_LABEL[r].toLowerCase()}.`);
    setTick((n) => n + 1);
  };
  const removeMember = async (m: Member) => {
    if (
      !(await ask(
        `Retirer ${m.name} de l'arbre ? Cette personne ne pourra plus l'ouvrir, sauf par le lien public s'il est actif.`,
        "Retirer",
      ))
    )
      return;
    const { error } = await supabase.from("tree_members").delete().eq("tree_id", treeId).eq("user_id", m.user_id);
    if (error) return say(frError(error.message), "error");
    say(`${m.name} a été retiré de l'arbre.`);
    setTick((n) => n + 1);
  };
  const cancelInvite = async (i: Invite) => {
    const { error } = await supabase.from("tree_invites").delete().eq("id", i.id);
    if (error) return say(frError(error.message), "error");
    say(`Invitation de ${i.email} annulée.`);
    setTick((n) => n + 1);
  };

  if (!members) return <p className="muted">Chargement des membres…</p>;
  return (
    <section className="stack members" aria-label="Membres">
      <h3>Membres de l'arbre</h3>
      <ul className="member-list">
        {members.map((m) => {
          const choices = m.user_id === me ? [] : rolesFor(role, m.role);
          return (
            <li key={m.user_id}>
              <span className="member-who">
                <span className="kin-name">
                  {m.name}
                  {m.user_id === me && " (vous)"}
                </span>
                {m.email && <span className="kin-meta">{m.email}</span>}
              </span>
              {choices.length ? (
                <>
                  <select aria-label={`Droits de ${m.name}`} value={m.role} onChange={(e) => setRole(m, e.target.value)}>
                    {(choices.includes(m.role) ? choices : [m.role, ...choices]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button className="link link-danger" onClick={() => removeMember(m)}>
                    Retirer
                  </button>
                </>
              ) : (
                <span className="member-role">{ROLE_LABEL[m.role] ?? m.role}</span>
              )}
            </li>
          );
        })}
      </ul>
      {invites.length > 0 && (
        <>
          <h3>Invitations en attente</h3>
          <ul className="member-list">
            {invites.map((i) => (
              <li key={i.id}>
                <span className="member-who">
                  <span className="kin-name">{i.email}</span>
                  <span className="kin-meta">{ROLE_LABEL[i.role]}, pas encore connecté</span>
                </span>
                <button className="link link-danger" onClick={() => cancelInvite(i)}>
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
