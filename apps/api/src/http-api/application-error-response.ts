import { Effect, Schema } from "effect";
import {
  ApplicationError,
  applicationErrorStatus,
} from "#src/shared/http/http-errors";
import {
  httpErrorResponse,
  reauthenticationRequiredResponse,
} from "#src/shared/http/handler-response";
import { ReauthenticationRequired } from "./contracts/shared.js";

export const applicationErrorResponse = (cause: unknown) => {
  if (!Schema.is(ApplicationError)(cause)) return Effect.die(cause);
  const status = applicationErrorStatus(cause);

  if (status === 500) return Effect.die(cause);

  // Every 401 asks the caller to sign in again with the same body.
  if (status === 401) {
    return reauthenticationRequiredResponse(
      new ReauthenticationRequired({
        code: cause.body.code,
        requiresReauth: true,
      }),
    );
  }

  if (status >= 500) {
    return Effect.succeed(
      httpErrorResponse(
        status,
        { code: cause.body.code, message: "Service unavailable" },
        cause.retryAfterMs,
      ),
    );
  }

  return Effect.succeed(
    httpErrorResponse(status, cause.body, cause.retryAfterMs),
  );
};
