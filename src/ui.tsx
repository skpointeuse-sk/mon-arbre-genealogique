import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

/* Fenêtre modale : Échap ferme, le focus va dans la fenêtre puis revient où il était. */
export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("[autofocus], input, select, textarea, button:not(.dialog-close)");
    (first ?? ref.current)?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("keydown", k);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"dialog" + (wide ? " dialog-wide" : "")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn dialog-close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

type Toast = { id: number; text: string; tone: "info" | "error" };
type Ctx = { say: (text: string, tone?: Toast["tone"]) => void; ask: (q: string, yes: string) => Promise<boolean> };
const C = createContext<Ctx>({ say: () => {}, ask: async () => false });
export const useUi = () => useContext(C);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [question, setQuestion] = useState<{ q: string; yes: string; done: (v: boolean) => void } | null>(null);
  const say = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);
  const ask = useCallback((q: string, yes: string) => new Promise<boolean>((done) => setQuestion({ q, yes, done })), []);
  const answer = (v: boolean) => {
    question?.done(v);
    setQuestion(null);
  };
  return (
    <C.Provider value={{ say, ask }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={"toast" + (t.tone === "error" ? " toast-error" : "")}>
            {t.text}
          </p>
        ))}
      </div>
      {question && (
        <Modal title="Confirmation" onClose={() => answer(false)}>
          <p className="dialog-text">{question.q}</p>
          <div className="dialog-actions">
            <button className="btn btn-quiet" onClick={() => answer(false)}>
              Annuler
            </button>
            <button className="btn btn-danger" autoFocus onClick={() => answer(true)}>
              {question.yes}
            </button>
          </div>
        </Modal>
      )}
    </C.Provider>
  );
}

/* Messages d'erreur Supabase traduits pour l'utilisateur. */
export function frError(msg?: string | null) {
  if (!msg) return "Une erreur est survenue. Réessayez.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered")) return "Un compte existe déjà avec cet email. Connectez-vous.";
  if (m.includes("password should be")) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre email avec le lien reçu.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Cette adresse email n'est pas valide.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Connexion impossible. Vérifiez votre accès à internet.";
  if (m.includes("row-level security") || m.includes("permission")) return "Vous n'avez pas les droits pour faire cette modification.";
  return msg;
}
