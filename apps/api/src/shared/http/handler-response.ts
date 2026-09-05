import { Effect } from "effect";
import { HttpServerResponse } from "effect/unstable/http";

export const statusCodeResponse = (error: {
  readonly status: number;
  readonly code: string;
}) =>
  Effect.succeed(
    HttpServerResponse.jsonUnsafe(
      { code: error.code },
      { status: error.status },
    ),
  );

export const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

export const emptyStatusResponse = (error: { readonly status: number }) =>
  Effect.succeed(HttpServerResponse.empty({ status: error.status }));
