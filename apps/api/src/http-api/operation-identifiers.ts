import { Context } from "effect";
import { OpenApi } from "effect/http-api";

export const operationIdentifiers = (
  endpoints: Record<string, { readonly annotations: Context.Context<never> }>,
) =>
  Object.fromEntries(
    Object.entries(endpoints).map(([identifier, endpoint]) => [
      identifier,
      Context.getOrUndefined(endpoint.annotations, OpenApi.Identifier) ??
        identifier,
    ]),
  );
