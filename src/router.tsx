import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, createRootRoute, createRoute, createRouter, useNavigate, useParams } from "@tanstack/react-router";
import { Landing } from "./Landing";
import { Wizard } from "./Wizard";
import { TreeView } from "./TreeView";
import { LegalPage, PrivacyPage } from "./Legal";
import { Mark } from "./icons";
import { useSession } from "./session";
import { myTreeQuery, sharedTreeQuery } from "./queries";

export function Waiting({ text }: { text: string }) {
  return (
    <div className="waiting" role="status">
      <Mark size={36} />
      <p>{text}</p>
    </div>
  );
}

function Message({ text, action = "Retour à l'accueil" }: { text: string; action?: string }) {
  return (
    <div className="waiting">
      <Mark size={36} />
      <p>{text}</p>
      <a className="btn btn-primary" href="/">
        {action}
      </a>
    </div>
  );
}

/* Page d'accueil. Les anciens liens « ?arbre=<id> » sont redirigés vers /partage/<id>. */
function HomePage() {
  const { session, ready } = useSession();
  const legacy = new URLSearchParams(location.search).get("arbre");
  if (legacy) return <Navigate to="/partage/$treeId" params={{ treeId: legacy }} replace />;
  if (!ready) return <Waiting text="Chargement…" />;
  if (session) return <Navigate to="/arbre" replace />;
  return <Landing />;
}

function CreatePage() {
  const { session, ready } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (!ready) return <Waiting text="Chargement…" />;
  if (!session) return <Navigate to="/" replace />;
  const done = async () => {
    await qc.invalidateQueries({ queryKey: ["my-tree", session.user.id] });
    navigate({ to: "/arbre" });
  };
  return <Wizard session={session} onDone={done} />;
}

function TreePage() {
  const { session, ready } = useSession();
  const q = useQuery({ ...myTreeQuery(session?.user.id ?? ""), enabled: !!session });
  if (!ready) return <Waiting text="Chargement…" />;
  if (!session) return <Navigate to="/" replace />;
  if (q.isPending) return <Waiting text="Chargement de votre arbre…" />;
  if (q.isError)
    return <Message text="Impossible de charger votre arbre. Vérifiez votre connexion, puis rechargez la page." action="Réessayer" />;
  if (!q.data) return <Navigate to="/creer" replace />;
  return <TreeView key={q.data.id} tree={q.data} session={session} />;
}

function SharedPage() {
  const { treeId } = useParams({ from: "/partage/$treeId" });
  const { session, ready } = useSession();
  const q = useQuery(sharedTreeQuery(treeId));
  if (!ready || q.isPending) return <Waiting text="Chargement de l'arbre…" />;
  if (q.isError || !q.data) return <Message text="Cet arbre est privé ou n'existe pas." action="Se connecter" />;
  return <TreeView key={q.data.id} tree={q.data} session={session} />;
}

/* Racine commune à toutes les pages. */
function Root() {
  useEffect(() => {
    document.documentElement.lang = "fr";
  }, []);
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: Root,
  notFoundComponent: () => <Message text="Cette page n'existe pas." />,
});
const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: "/", component: HomePage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/creer", component: CreatePage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/arbre", component: TreePage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/partage/$treeId", component: SharedPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/mentions-legales", component: LegalPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/confidentialite", component: PrivacyPage }),
]);

export const router = createRouter({ routeTree, defaultPreload: false });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
