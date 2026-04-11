import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "@/lib/query-client";
import type { QueryClient } from "@tanstack/react-query";
import type { SessionData } from "@/hooks/auth/use-session";
import { RouteSectionLoading } from "@/components/ui/route-section-loading";

export interface RouterContext {
  queryClient: QueryClient;
  session?: SessionData | null;
}

const parseSearch = (searchString: string) => {
  const normalizedSearch = searchString.startsWith("?")
    ? searchString.slice(1)
    : searchString;
  const searchParams = new URLSearchParams(normalizedSearch);
  const parsedSearch = Object.create(null) as Record<string, string | string[]>;
  const seenKeys = new Set<string>();

  for (const key of searchParams.keys()) {
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);

    const values = searchParams.getAll(key);
    parsedSearch[key] = values.length > 1 ? values : (values[0] ?? "");
  }

  return parsedSearch;
};

const stringifySearch = (search: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) {
          continue;
        }

        searchParams.append(key, String(item));
      }

      continue;
    }

    searchParams.set(key, String(value));
  }

  const serializedSearch = searchParams.toString();
  return serializedSearch ? `?${serializedSearch}` : "";
};

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    session: undefined,
  },
  parseSearch,
  stringifySearch,
  defaultPendingComponent: RouteSectionLoading,
  defaultPendingMs: 120,
  defaultPendingMinMs: 250,
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
