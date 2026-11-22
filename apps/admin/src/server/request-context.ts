import "@tanstack/react-start/server-only";
import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  readonly cookie: string;
  readonly nonce: string;
};

const requests = new AsyncLocalStorage<RequestContext>();

export const runRequest = <A>(context: RequestContext, run: () => A): A =>
  requests.run(context, run);

export const currentRequest = (): RequestContext => {
  const context = requests.getStore();

  if (!context) throw new Error("No guarded request is being served.");

  return context;
};

export const currentNonce = (): string | undefined =>
  requests.getStore()?.nonce;
