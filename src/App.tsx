import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Tree } from "./lib";
import { Landing } from "./Landing";
import { Wizard } from "./Wizard";
import { TreeView } from "./TreeView";
import { UiProvider } from "./ui";
import { Mark } from "./icons";

function Waiting({ text }: { text: string }) {
  return <div className="waiting" role="status"><Mark size={36} /><p>{text}</p></div>;
}

function Main() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tree, setTree] = useState<Tree | null | undefined>(undefined);
  const shared = new URLSearchParams(location.search).get("arbre");

  const loadTree = async (s: Session) => {
    await supabase.rpc("claim_invites");
    const { data: m } = await supabase.from("tree_members").select("tree_id").eq("user_id", s.user.id).order("created_at").limit(1);
    if (!m?.length) return setTree(null);
    const { data } = await supabase.from("trees").select("*").eq("id", m[0].tree_id).single();
    setTree((data as Tree) ?? null);
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (shared) supabase.from("trees").select("*").eq("id", shared).maybeSingle().then(({ data }) => setTree((data as Tree) ?? null));
    else if (session) loadTree(session);
    else setTree(undefined);
  }, [session?.user.id, shared]);

  if (!ready) return <Waiting text="Chargement…" />;
  if (!shared && !session) return <Landing />;
  if (tree === undefined) return <Waiting text="Chargement de votre arbre…" />;
  if (tree === null) return shared
    ? <div className="waiting"><Mark size={36} /><p>Cet arbre est privé ou n'existe pas.</p><a className="btn btn-primary" href="/">Se connecter</a></div>
    : <Wizard session={session!} onDone={() => loadTree(session!)} />;
  return <TreeView key={tree.id} tree={tree} session={session} />;
}

export default function App() {
  return <UiProvider><Main /></UiProvider>;
}
