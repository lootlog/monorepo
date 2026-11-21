import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  /** The email Cloudflare Access verified. */
  readonly accessEmail: string;
  /** The browser's cookies, which carry the operator's Lootlog session. */
  readonly cookie: string;
  /** Marks the scripts and styles this response may run. */
  readonly nonce: string;
};

const requests = new AsyncLocalStorage<RequestContext>();

/** Runs a request the guard let through. */
export const runRequest = <A>(context: RequestContext, run: () => A): A =>
  requests.run(context, run);

/**
 * The request being served. Throws outside one, so nothing reaches the auth
 * service without having passed the guard.
 */
export const currentRequest = (): RequestContext => {
  const context = requests.getStore();

  if (!context) throw new Error("No guarded request is being served.");

  return context;
};

export const currentNonce = (): string | undefined =>
  requests.getStore()?.nonce;
