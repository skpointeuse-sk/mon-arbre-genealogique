import { queryOptions } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Tree } from "./lib";

/* Premier arbre de l'utilisateur connecté. Les invitations en attente sont réclamées avant. */
export const myTreeQuery = (userId: string) =>
  queryOptions({
    queryKey: ["my-tree", userId],
    queryFn: async (): Promise<Tree | null> => {
      await supabase.rpc("claim_invites");
      const { data: m, error } = await supabase.from("tree_members").select("tree_id").eq("user_id", userId).order("created_at").limit(1);
      if (error) throw error;
      if (!m?.length) return null;
      const { data, error: e2 } = await supabase.from("trees").select("*").eq("id", m[0].tree_id).single();
      if (e2) throw e2;
      return (data as Tree) ?? null;
    },
  });

/* Arbre ouvert par lien de partage : null s'il est privé ou n'existe pas (la RLS filtre). */
export const sharedTreeQuery = (treeId: string) =>
  queryOptions({
    queryKey: ["tree", treeId],
    queryFn: async (): Promise<Tree | null> => {
      const { data, error } = await supabase.from("trees").select("*").eq("id", treeId).maybeSingle();
      if (error) throw error;
      return (data as Tree) ?? null;
    },
  });
