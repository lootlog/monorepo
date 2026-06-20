import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { GlobalContextProvider } from "@/contexts/global-context";
import { ThemeProvider } from "@/contexts/theme-context";
import type { RouterContext } from "@/App";
import { DocumentTitleUpdater } from "@/components/router/document-title-updater";
import { RootRouteError } from "@/components/router/root-route-error";
import { RootRouteNotFound } from "@/components/router/root-route-not-found";
import { resolveDocumentTitle } from "@/lib/router/document-title";
import { ThemeRootEffects, ThemeSpinnerProvider } from "@/themes";

import "@lootlog/ui/globals.css";
import "../scrollbars.css";
import "@/i18n/config";

const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  })),
);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const getPrefersReducedMotion = () =>
  window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;

const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!mediaQueryList) {
      return undefined;
    }

    const handleChange = () => {
      setPrefersReducedMotion(mediaQueryList.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
};

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    document.documentElement.classList.add("theme-ready");
  }, []);

  return (
    <>
      <HeadContent />
      <DocumentTitleUpdater queryClient={queryClient} />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeSpinnerProvider>
            <NuqsAdapter>
              <GlobalContextProvider>
                <Outlet />
                {!prefersReducedMotion && <ThemeRootEffects />}
                {import.meta.env.DEV ? (
                  <Suspense fallback={null}>
                    <ReactQueryDevtools initialIsOpen={false} />
                  </Suspense>
                ) : null}
              </GlobalContextProvider>
            </NuqsAdapter>
          </ThemeSpinnerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: ({ matches }) => ({
    meta: [{ title: resolveDocumentTitle(matches) }],
  }),
  component: RootComponent,
  errorComponent: RootRouteError,
  notFoundComponent: RootRouteNotFound,
});
