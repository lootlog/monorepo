import { boundedHttpGet } from "@lootlog/instrumentation/bounded-http-get";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";
import { BotConfig } from "#src/config/bot-config";

/**
 * Why a command could not read Lootlog data, in the terms a player can act
 * on. Every HTTP status and transport failure maps to exactly one reason.
 */
export class CommandFailure extends TaggedErrorClass<CommandFailure>()(
  "CommandFailure",
  {
    reason: Schema.Literals([
      "not-linked",
      "reauthenticate",
      "forbidden",
      "not-found",
      "unavailable",
    ]),
  },
) {}

type QueryValue = string | number | boolean | ReadonlyArray<string>;

export type Query = Readonly<Record<string, QueryValue | undefined>>;

type Read = <A, I>(
  path: string,
  query: Query,
  schema: Schema.Codec<A, I>,
) => Effect.Effect<A, CommandFailure>;

/** Reads made on behalf of one Member, with the access policy of the Web app. */
export interface MemberSession {
  readonly guildId: string;
  readonly api: Read;
  readonly gateway: Read;
}

export interface LootlogClientValue {
  readonly member: (
    guildId: string,
    discordId: string,
  ) => Effect.Effect<MemberSession, CommandFailure>;
  readonly search: Read;
  readonly publicFile: (
    path: string,
  ) => Effect.Effect<Uint8Array, CommandFailure>;
}

const MemberIdentity = Schema.Struct({ userId: Schema.String });

const failureForStatus = (status: number): CommandFailure | undefined => {
  if (status >= 200 && status < 300) return undefined;

  if (status === 401) return new CommandFailure({ reason: "reauthenticate" });

  if (status === 403) return new CommandFailure({ reason: "forbidden" });

  if (status === 404) return new CommandFailure({ reason: "not-found" });

  return new CommandFailure({ reason: "unavailable" });
};

const buildUrl = (baseUrl: string, path: string, query: Query) => {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    for (const item of Array.isArray(value) ? value : [value])
      url.searchParams.append(key, String(item));
  }

  return url;
};

export class LootlogClient extends Context.Service<
  LootlogClient,
  LootlogClientValue
>()("@lootlog/discord-bot/LootlogClient") {
  static readonly layer = Layer.effect(
    LootlogClient,
    Effect.gen(function* () {
      const config = yield* BotConfig;
      const httpClient = yield* HttpClient.HttpClient;

      const get = (
        client: HttpClient.HttpClient,
        operationId: string,
        url: URL,
      ) =>
        boundedHttpGet({
          client,
          url,
          timeoutMilliseconds: 2500,
          retries: 1,
          operationId,
          adapter: "discord-command",
          response: "raw",
          failure: (_reason, retryable) => ({ retryable }),
          decode: (body, status) => ({ status, body: new Uint8Array(body) }),
        }).pipe(
          Effect.mapError(() => new CommandFailure({ reason: "unavailable" })),
        );

      const read =
        (client: HttpClient.HttpClient, baseUrl: string): Read =>
        (path, query, schema) =>
          get(client, path, buildUrl(baseUrl, path, query)).pipe(
            Effect.flatMap(({ status, body }) => {
              const failure = failureForStatus(status);

              if (failure) return Effect.fail(failure);

              return Schema.decodeUnknownEffect(Schema.fromJsonString(schema))(
                new TextDecoder().decode(body),
              ).pipe(
                Effect.mapError(
                  () => new CommandFailure({ reason: "unavailable" }),
                ),
              );
            }),
          );

      const member = Effect.fn("LootlogClient.member")(function* (
        guildId: string,
        discordId: string,
      ) {
        const identityPath = `/internal/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(discordId)}/identity`;

        const { userId } = yield* read(httpClient, config.apiServiceUrl)(
          identityPath,
          {},
          MemberIdentity,
        ).pipe(
          Effect.catchIf(
            (failure) => failure.reason === "not-found",
            () => Effect.fail(new CommandFailure({ reason: "not-linked" })),
          ),
        );

        // The API and gateway trust these headers from the private network,
        // exactly as they trust the edge after it verified a session.
        const asMember = HttpClient.mapRequest(
          httpClient,
          HttpClientRequest.setHeaders({
            "x-auth-user-id": userId,
            "x-auth-discord-id": discordId,
          }),
        );

        return {
          guildId,
          api: read(asMember, config.apiServiceUrl),
          gateway: read(asMember, config.gatewayServiceUrl),
        } satisfies MemberSession;
      });

      const publicFile = (path: string) =>
        get(httpClient, path, buildUrl(config.apiServiceUrl, path, {})).pipe(
          Effect.flatMap(({ status, body }) => {
            const failure = failureForStatus(status);

            return failure ? Effect.fail(failure) : Effect.succeed(body);
          }),
        );

      return LootlogClient.of({
        member,
        search: read(httpClient, config.searchServiceUrl),
        publicFile,
      });
    }),
  );
}

/** Resolves the Member behind an invocation; every Lootlog read starts here. */
export const memberSession = (invocation: {
  readonly guildId: string;
  readonly discordId: string;
}) =>
  Effect.flatMap(LootlogClient, (client) =>
    client.member(invocation.guildId, invocation.discordId),
  );
