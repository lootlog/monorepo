import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";

interface DiscordAuthOptionsInput {
  clientId: string;
  clientSecret: string;
  redirectURI: string;
  scopes: string[];
}

const isDiscordOAuthCallback = (
  context: Parameters<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<BetterAuthOptions["databaseHooks"]>["user"]
        >["update"]
      >["before"]
    >
  >[1],
) => context?.path === "/callback/:id" && context.params?.id === "discord";

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
      validateUserInfo: ({ source, user }) => {
        const providerProfileId = source.oauth?.profile?.id;

        if (
          source.method !== "oauth" ||
          source.oauth?.providerId !== "discord" ||
          typeof providerProfileId !== "string" ||
          user.discordId !== providerProfileId
        ) {
          return {
            error: "INVALID_DISCORD_IDENTITY",
            errorDescription: "Discord identity could not be verified",
          };
        }
      },
    },
    databaseHooks: {
      user: {
        update: {
          before: (user, context) => {
            if (
              user.discordId !== undefined &&
              !isDiscordOAuthCallback(context)
            ) {
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
        overrideUserInfoOnSignIn: true,
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
