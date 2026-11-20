import { Effect, Schema } from "effect";
import {
  ApplicationError,
  applicationErrorHttpResponse,
  applicationErrorStatus,
} from "@lootlog/protocol/http/errors";
import { reauthenticationRequiredResponse } from "#src/shared/http/handler-response";
import { ReauthenticationRequired } from "#src/contracts/api-shared";

/** The shared answer, except that every 401 asks the caller to sign in again. */
export const applicationErrorResponse = (cause: unknown) =>
  Schema.is(ApplicationError)(cause) && applicationErrorStatus(cause) === 401
    ? reauthenticationRequiredResponse(
        new ReauthenticationRequired({
          code: cause.body.code,
          requiresReauth: true,
        }),
      )
    : applicationErrorHttpResponse(cause);
