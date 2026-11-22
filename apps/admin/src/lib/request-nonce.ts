import { createIsomorphicFn } from "@tanstack/react-start";
import { currentNonce } from "@/server/request-context";

export const requestNonce = createIsomorphicFn()
  .server(() => currentNonce())
  .client(
    () =>
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ||
      undefined,
  );
