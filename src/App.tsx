import { Component, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { UiProvider } from "./ui";
import { Mark } from "./icons";
import { SessionProvider } from "./session";
import { router } from "./router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

/* Filet de sécurité : une erreur imprévue affiche un message au lieu d'une page blanche. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="waiting" role="alert">
        <Mark size={36} />
        <p>Un problème inattendu est survenu. Vos données ne sont pas perdues.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Recharger la page
        </button>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <UiProvider>
            <RouterProvider router={router} />
          </UiProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
