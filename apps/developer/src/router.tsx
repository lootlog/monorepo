import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    // Scalar owns hash navigation and scrolling inside the HTTP reference.
    scrollRestoration: ({ location }) =>
      !location.pathname.replace(/\/$/, "").endsWith("/reference"),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
