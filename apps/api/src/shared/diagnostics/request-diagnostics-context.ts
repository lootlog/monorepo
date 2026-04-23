import { AsyncLocalStorage } from "node:async_hooks";

export type RequestDiagnosticsContext = {
  method: string;
  requestId: string;
  sampled: boolean;
  startTimeMs: number;
  url: string;
  route?: string;
};

export const requestDiagnosticsStorage =
  new AsyncLocalStorage<RequestDiagnosticsContext>();

export function getRequestDiagnosticsContext() {
  return requestDiagnosticsStorage.getStore();
}

export function setRequestDiagnosticsRoute(route: string) {
  const context = requestDiagnosticsStorage.getStore();
  if (context) {
    context.route = route;
  }
}
