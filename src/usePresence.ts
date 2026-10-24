import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Present = { id: string; name: string };

/* « Testeur A » donne « TA », « Jeanne » donne « JE ». */
export const initials = (name: string) => {
  const w = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 2)).toUpperCase();
};

/* Qui regarde l'arbre en ce moment. Canal privé « arbre:<id> » : la base n'y laisse entrer
   que les membres connectés (politiques sur realtime.messages). */
export function usePresence(treeId: string, session: Session | null) {
  const [others, setOthers] = useState<Present[]>([]);
  useEffect(() => {
    if (!session) return;
    const me = session.user.id;
    const name = (session.user.user_metadata?.full_name as string | undefined) || session.user.email?.split("@")[0] || "Membre";
    const ch = supabase.channel(`arbre:${treeId}`, { config: { private: true, presence: { key: me } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ name: string }>();
      setOthers(
        Object.entries(state)
          .filter(([k]) => k !== me)
          .map(([k, v]) => ({ id: k, name: v[0]?.name ?? "Membre" })),
      );
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ name });
    });
    return () => {
      setOthers([]);
      supabase.removeChannel(ch);
    };
  }, [treeId, session]);
  return others;
}
