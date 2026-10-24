import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/* Session Supabase partagée par toutes les pages. `ready` passe à vrai une fois la session lue. */
type Ctx = { session: Session | null; ready: boolean };
const C = createContext<Ctx>({ session: null, ready: false });
export const useSession = () => useContext(C);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ session: null, ready: false });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setState({ session: s, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <C.Provider value={state}>{children}</C.Provider>;
}
