import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";

interface DiscordAuthOptionsInput {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  scopes: string[];
}

export const createDiscordAuthOptions = ({
  clientId,
  clientSecret,
  redirectURI,
  scopes,
}: DiscordAuthOptionsInput) =>
  ({
    user: {
      additionalFields: {
        discordId: {
          type: "string",
          required: true,
          input: true,
        },
      },
      deleteUser: {
        enabled: true,
      },
    },
    databaseHooks: {
      user: {
        update: {
          before: (user) => {
            if (user.discordId !== undefined) {
              throw new APIError("BAD_REQUEST", {
                code: "DISCORD_ID_IMMUTABLE",
                message: "Discord ID cannot be changed",
              });
            }

            return Promise.resolve();
          },
        },
      },
    },
    socialProviders: {
      discord: {
        clientId,
        clientSecret,
        redirectURI,
        prompt: "consent",
        scope: scopes,
        mapProfileToUser: (profile) => ({
          firstName: profile.given_name,
          lastName: profile.family_name,
          discordId: profile.id,
        }),
      },
    },
  }) satisfies Pick<
    BetterAuthOptions,
    "databaseHooks" | "socialProviders" | "user"
  >;
