import type { BetterAuthPlugin } from "better-auth";
import {
  createAuthEndpoint,
  createAuthMiddleware,
  sessionMiddleware,
} from "better-auth/api";
import { generateRandomString } from "better-auth/crypto";
import { Option, Schema } from "effect";

/**
 * Lets the Game client on a Margonem page sign in when the browser withholds
 * Lootlog's first-party session cookie from that cross-site page.
 *
 * The signed-in web app mints a single-use code for one Margonem origin and
 * posts it to the Game client popup opener, restricted to that origin. The
 * Game client redeems the code with a credentialed cross-site request, and
 * the response stores the same session cookie as `Partitioned` (CHIPS), so it
 * lives in the Margonem partition and reaches the forward-auth `Cookie` check
 * and the gateway handshake under its usual name.
 */

export const GAME_CLIENT_HANDOFF_TTL_SECONDS = 60;

const GAME_CLIENT_ORIGIN = /^https:\/\/[a-z0-9-]+\.margonem\.(?:pl|com)$/u;

const IDENTIFIER_PREFIX = "game-client-handoff:";

const CODE_LENGTH = 43;

const HandoffRequest = Schema.Struct({
  origin: Schema.String.check(Schema.isMaxLength(255)),
});

const ExchangeRequest = Schema.Struct({
  code: Schema.String.check(Schema.isLengthBetween(CODE_LENGTH, CODE_LENGTH)),
});

const HandoffRecord = Schema.fromJsonString(
  Schema.Struct({ origin: Schema.String, sessionToken: Schema.String }),
);

const decodeHandoffRecord = Schema.decodeUnknownOption(HandoffRecord);

export const isGameClientOrigin = (origin: string): boolean =>
  GAME_CLIENT_ORIGIN.test(origin);

// Only a hash reaches storage, so a storage read cannot redeem a live code.
const handoffIdentifier = (code: string) =>
  `${IDENTIFIER_PREFIX}${new Bun.CryptoHasher("sha256").update(code).digest("base64url")}`;

export const gameClientHandoff = () =>
  ({
    id: "lootlog-game-client-handoff",
    endpoints: {
      createGameClientHandoff: createAuthEndpoint(
        "/game-client/handoff",
        {
          method: "POST",
          body: Schema.toStandardSchemaV1(HandoffRequest),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const { origin } = ctx.body;

          if (!isGameClientOrigin(origin))
            throw ctx.error("BAD_REQUEST", { message: "Invalid game origin" });

          const code = generateRandomString(CODE_LENGTH, "a-z", "A-Z", "0-9");

          await ctx.context.internalAdapter.createVerificationValue({
            identifier: handoffIdentifier(code),
            value: JSON.stringify({
              origin,
              sessionToken: ctx.context.session.session.token,
            }),
            expiresAt: new Date(
              Date.now() + GAME_CLIENT_HANDOFF_TTL_SECONDS * 1_000,
            ),
          });

          ctx.setHeader("cache-control", "no-store");

          return ctx.json({ code, expiresIn: GAME_CLIENT_HANDOFF_TTL_SECONDS });
        },
      ),
      exchangeGameClientHandoff: createAuthEndpoint(
        "/game-client/exchange",
        {
          method: "POST",
          body: Schema.toStandardSchemaV1(ExchangeRequest),
          requireHeaders: true,
        },
        async (ctx) => {
          const origin = ctx.headers.get("origin");

          if (origin === null || !isGameClientOrigin(origin))
            throw ctx.error("FORBIDDEN", { message: "Invalid game origin" });

          // Consumed before the binding checks, so a code never survives a use.
          const verification =
            await ctx.context.internalAdapter.consumeVerificationValue(
              handoffIdentifier(ctx.body.code),
            );

          const record =
            verification === null
              ? undefined
              : Option.getOrUndefined(decodeHandoffRecord(verification.value));

          if (record === undefined || record.origin !== origin)
            throw ctx.error("BAD_REQUEST", { message: "Invalid handoff code" });

          const session = await ctx.context.internalAdapter.findSession(
            record.sessionToken,
          );

          if (session === null || session.session.expiresAt <= new Date())
            throw ctx.error("BAD_REQUEST", { message: "Invalid handoff code" });

          const cookie = ctx.context.authCookies.sessionToken;

          await ctx.setSignedCookie(
            cookie.name,
            session.session.token,
            ctx.context.secret,
            {
              ...cookie.attributes,
              sameSite: "none",
              secure: true,
              partitioned: true,
              maxAge: Math.floor(
                (session.session.expiresAt.getTime() - Date.now()) / 1_000,
              ),
            },
          );
          ctx.setHeader("cache-control", "no-store");

          // The page learns who signed in from get-session, never the token.
          return ctx.json({ status: "connected" as const });
        },
      ),
    },
    hooks: {
      after: [
        {
          // Sign-out expires the unpartitioned cookie; this also clears the
          // copy a Game client stored in the Margonem partition.
          matcher: (ctx) => ctx.path === "/sign-out",
          handler: createAuthMiddleware((ctx) => {
            const cookie = ctx.context.authCookies.sessionToken;

            ctx.setCookie(cookie.name, "", {
              ...cookie.attributes,
              sameSite: "none",
              secure: true,
              partitioned: true,
              maxAge: 0,
            });

            return Promise.resolve();
          }),
        },
      ],
    },
  }) satisfies BetterAuthPlugin;
