import { runLogEffect } from "@lootlog/instrumentation";
import { Effect, Option, Schema } from "effect";
import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { refreshAccessToken } from "better-auth/oauth2";

const DISCORD_TOKEN_ENDPOINT = "https://discord.com/api/oauth2/token";

const decodeRefreshRefusal = Schema.decodeUnknownOption(
  Schema.Struct({
    status: Schema.optional(Schema.Finite),
    error: Schema.optional(Schema.String),
  }),
);

const OAUTH_ERROR_CODE = /^[A-Za-z0-9_]{1,64}$/u;

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

const DIFFERENT_DISCORD_ACCOUNT = "DIFFERENT_DISCORD_ACCOUNT";

type ValidateUserInfoContext = Parameters<
  NonNullable<NonNullable<BetterAuthOptions["user"]>["validateUserInfo"]>
>[1];

const isKnownDiscordIdentity = async (
  { context }: ValidateUserInfoContext,
  {
    userId,
    email,
    discordAccountId,
  }: {
    userId: string;
    email: string | undefined;
    discordAccountId: string;
  },
) => {
  const [storedUser, accounts] = await Promise.all([
    context.internalAdapter.findUserById(userId),
    context.internalAdapter.findAccounts(userId),
  ]);

  return (
    accounts.some(
      (account) =>
        account.providerId === "discord" &&
        account.accountId === discordAccountId,
    ) ||
    (storedUser !== null &&
      email !== undefined &&
      storedUser.email.toLowerCase() === email.toLowerCase())
  );
};

export const createDiscordAuthOptions = ({
  clientId,
  clientSecret,
  redirectURI,
  scopes,
}: DiscordAuthOptionsInput) =>
  ({
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        allowDifferentEmails: true,
        updateUserInfoOnLink: true,
      },
    },
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
      validateUserInfo: async ({ source, user }, context) => {
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

        if (source.action !== "link-account") return;

        if (
          user.id !== undefined &&
          (await isKnownDiscordIdentity(context, {
            userId: user.id,
            email: user.email,
            discordAccountId: providerProfileId,
          }))
        )
          return;

        runLogEffect(
          Effect.logWarning("Discord account does not match the user").pipe(
            Effect.annotateLogs({
              context: "BetterAuth",
              userId: user.id ?? "unknown",
            }),
          ),
        );

        return {
          error: DIFFERENT_DISCORD_ACCOUNT,
          errorDescription:
            "The Discord account belongs to a different identity",
        };
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
        disableIdTokenSignIn: true,
        scope: scopes,
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
    "account" | "databaseHooks" | "socialProviders" | "user"
  >;
