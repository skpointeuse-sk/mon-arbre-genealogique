import { createClient } from "@supabase/supabase-js";

// Clés publiques (faites pour être visibles) : valeurs par défaut si Vercel n'en fournit pas.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://nyboahgdnqivjliqcrtd.supabase.co";
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "sb_publishable_ik0FkJWg51z39sF41OgWDg_MZoEMvyQ";

export const supabase = createClient(url, key);
