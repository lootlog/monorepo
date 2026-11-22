import { runLogEffect } from "@lootlog/instrumentation";
import { Effect, Option, Schema } from "effect";
import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { refreshAccessToken } from "better-auth/oauth2";

const DISCORD_TOKEN_ENDPOINT = "https://discord.com/api/oauth2/token";

// Discord's refusal as better-fetch reports it: the HTTP status next to the
// fields of the OAuth error body.
const decodeRefreshRefusal = Schema.decodeUnknownOption(
  Schema.Struct({
    status: Schema.optional(Schema.Finite),
    error: Schema.optional(Schema.String),
  }),
);

const OAUTH_ERROR_CODE = /^[A-Za-z0-9_]{1,64}$/u;

/**
 * Better Auth replaces a failed refresh with one generic error, so this is the
 * only place Discord's reason is visible. Only the status and the OAuth error
 * code are logged; tokens and the error description stay out of logs.
 */
const logRefreshFailure = (cause: unknown) => {
  const refusal = Option.getOrUndefined(decodeRefreshRefusal(cause));
  const code = refusal?.error;

  runLogEffect(
    Effect.logWarning("Discord token refresh failed").pipe(
      Effect.annotateLogs({
        context: "BetterAuth",
        status: refusal?.status ?? "unknown",
        code:
          code === undefined
            ? "unknown"
            : OAUTH_ERROR_CODE.test(code)
              ? code
              : "unrecognized",
      }),
    ),
  );
};

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
          !Schema.is(Schema.String)(providerProfileId) ||
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
        // The provider's own refresh, with the failure logged before Better
        // Auth discards it.
        refreshAccessToken: (refreshToken) =>
          refreshAccessToken({
            refreshToken,
            options: { clientId, clientSecret },
            tokenEndpoint: DISCORD_TOKEN_ENDPOINT,
          }).catch((cause: unknown) => {
            logRefreshFailure(cause);
            throw cause;
          }),
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
