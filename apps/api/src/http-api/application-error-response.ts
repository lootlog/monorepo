import { Schema } from "effect";
import {
  ApplicationError,
  applicationErrorHttpResponse,
  applicationErrorStatus,
  ReauthenticationRequired,
  reauthenticationRequiredResponse,
} from "@lootlog/protocol/http/errors";

export const applicationErrorResponse = (cause: unknown) =>
  Schema.is(ApplicationError)(cause) && applicationErrorStatus(cause) === 401
    ? reauthenticationRequiredResponse(
        new ReauthenticationRequired({
          code: cause.body.code,
          requiresReauth: true,
        }),
      )
    : applicationErrorHttpResponse(cause);
