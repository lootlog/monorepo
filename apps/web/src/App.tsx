import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { SessionData } from "@/hooks/auth/use-session";

export interface RouterContext {
  queryClient: QueryClient;
  session?: SessionData | null;
}

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    session: undefined,
  },
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
