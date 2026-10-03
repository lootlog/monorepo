import { Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/http";
import { ReauthenticationRequired } from "#src/http-api/contracts/shared";

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

const encodeReauthenticationRequired = Schema.encodeSync(
  ReauthenticationRequired,
);

/**
 * HttpApi encodes a failure with the endpoint's own error schemas before the
 * bearer middleware's, so an empty or open endpoint error would claim this one.
 * Handlers answer it explicitly to keep the declared 401 body on every route.
 */
export const reauthenticationRequiredResponse = (
  error: ReauthenticationRequired,
) =>
  Effect.succeed(
    HttpServerResponse.jsonUnsafe(encodeReauthenticationRequired(error), {
      status: 401,
    }),
  );

export const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

export const emptyStatusResponse = (error: { readonly status: number }) =>
  Effect.succeed(HttpServerResponse.empty({ status: error.status }));

/** Preserve missing or non-string legacy route parameters for authorization to reject. */
export const optionalPathString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
