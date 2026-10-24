import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { type Person, type Union, clean } from "./lib";
import { frError } from "./ui";

/* Personnes, unions et photos d'un arbre, rechargées à chaque changement reçu en temps réel. */
export function useTreeData(treeId: string) {
  const [people, setPeople] = useState<Person[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("people").select("*").eq("tree_id", treeId).order("created_at");
    if (error) {
      setLoadError(frError(error.message));
      setLoaded(true);
      return null;
    }
    const ps = ((data as Person[]) || []).map(clean);
    setPeople(ps);
    setLoaded(true);
    const paths = ps.filter((p) => p.photo_path).map((p) => p.photo_path!);
    if (paths.length) {
      const { data: sg } = await supabase.storage.from("tree-media").createSignedUrls(paths, 3600);
      const m: Record<string, string> = {};
      sg?.forEach((x) => {
        if (x.path && x.signedUrl) m[x.path] = x.signedUrl;
      });
      setUrls(m);
    }
    const { data: u } = await supabase.from("unions").select("*").eq("tree_id", treeId);
    setUnions((u as Union[]) || []);
    return { people: ps, unions: (u as Union[]) || [] };
  }, [treeId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("p-" + treeId)
      .on("postgres_changes", { event: "*", schema: "public", table: "people", filter: `tree_id=eq.${treeId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "unions", filter: `tree_id=eq.${treeId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [treeId, load]);

  return { people, unions, urls, loaded, loadError, load };
}
