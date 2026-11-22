import { createRouter } from "@tanstack/react-router";
import { requestNonce } from "@/lib/request-nonce";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: false,
    ssr: { nonce: requestNonce() },
    parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
    stringifySearch: (search) => {
      const params = new URLSearchParams();

      for (const [name, value] of Object.entries(search))
        if (value !== undefined && value !== "") params.set(name, `${value}`);

      return params.size === 0 ? "" : `?${params}`;
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
