import { AUTH_SERVICE_URL } from "@/src/config/auth";
import { createAuthClient } from "better-auth/react";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient(
  {
    baseURL: `${AUTH_SERVICE_URL}/idp`,
  }
);
