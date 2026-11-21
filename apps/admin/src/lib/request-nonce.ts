import { createIsomorphicFn } from "@tanstack/react-start";
import { currentNonce } from "@/server/request-context";

/**
 * The nonce of the page: on the server the one its response announces, in the
 * browser the one its scripts arrived with.
 */
export const requestNonce = createIsomorphicFn()
  .server(() => currentNonce())
  .client(
    () =>
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ||
      undefined,
  );
