import { ApiError } from "@lootlog/client/transport";
import { Schema } from "effect";

const isReauthenticationResponse = Schema.is(
  Schema.Struct({ requiresReauth: Schema.Literal(true) }),
);

export const requiresReauthentication = (error: Error | null): boolean =>
  error instanceof ApiError && isReauthenticationResponse(error.data);

export const isReauthenticationError = (error: Error | null): boolean =>
  error instanceof ApiError &&
  (error.status === 401 || requiresReauthentication(error));
