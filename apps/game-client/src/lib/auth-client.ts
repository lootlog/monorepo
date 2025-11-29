import { AUTH_SERVICE_URL } from "@/config/auth";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: `${AUTH_SERVICE_URL}/idp`,
  plugins: [
    inferAdditionalFields({
      user: {
        discordId: {
          type: "string",
          required: true,
        },
      },
    }),
  ],
});
