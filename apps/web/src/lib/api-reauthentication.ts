import { ApiError } from "@lootlog/client/transport";
import { z } from "zod";

const reauthenticationResponse = z.object({ requiresReauth: z.literal(true) });

export const requiresReauthentication = (error: Error | null): boolean =>
  error instanceof ApiError &&
  reauthenticationResponse.safeParse(error.data).success;

export const isReauthenticationError = (error: Error | null): boolean =>
  error instanceof ApiError &&
  (error.status === 401 || requiresReauthentication(error));
