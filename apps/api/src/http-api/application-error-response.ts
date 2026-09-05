import { Effect, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import {
  ApplicationError,
  applicationErrorStatus,
} from "#src/shared/http/http-errors";

export const applicationErrorResponse = (cause: unknown) => {
  if (!Schema.is(ApplicationError)(cause)) return Effect.die(cause);
  const status = applicationErrorStatus(cause);
  if (status === 500) return Effect.die(cause);
  if (status >= 500) {
    return Effect.succeed(
      HttpServerResponse.jsonUnsafe(
        { statusCode: status, message: "Service unavailable" },
        { status },
      ),
    );
  }
  const response = cause.getResponse();
  const body = typeof response === "string" ? { message: response } : response;
  return Effect.succeed(HttpServerResponse.jsonUnsafe(body, { status }));
};
