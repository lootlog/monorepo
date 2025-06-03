import { AUTH_SERVICE_URL } from "@/config/auth";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: `${AUTH_SERVICE_URL}/idp`,
});
