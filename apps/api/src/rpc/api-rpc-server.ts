import {
  ApiOperatorRpcGroup,
  ApiRpcGroup,
  ApiServedRpcGroup,
} from "@lootlog/rpc/api";
import {
  RpcBadRequestError,
  RpcForbiddenError,
  RpcNotFoundError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { serviceRpcRoutes, serviceRpcServer } from "@lootlog/rpc/server";
import {
  AUTH_DISCORD_ID_HEADER,
  AUTH_USER_ID_HEADER,
} from "@lootlog/schema/api-key-access";
import { Context, Effect, Layer, Schema } from "effect";
import { isUndefined, omitBy } from "es-toolkit";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServer,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";
import {
  CharacterAurasData,
  type CharacterAurasOperationError,
} from "#src/character-auras/character-auras-data";
import { InternalGuildsData } from "#src/guilds/internal-guilds-data";
import { UserPlansData } from "#src/plans/user-plans";
import {
  OrganizationOperatorData,
  type OrganizationOperatorFailure,
} from "#src/guilds/organization-operator.data-layer";
import { LootlogApi } from "#src/http-api/lootlog-api";
import {
  getGuildByIdOrVanityUrl,
  getMemberIdentity,
  getUserGuildPermissions,
} from "#src/rpc/internal-guilds-rpc";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

interface MemberActor {
  readonly userId: string;
  readonly discordId: string;
}

class RpcActor extends Context.Service<RpcActor, MemberActor>()(
  "@lootlog/api/rpc/RpcActor",
) {}

const defined = <Query extends object>(query: Query) =>
  omitBy(query, isUndefined);

const statusFailure = (status: number) => {
  if (status === 401) return new RpcUnauthorizedError();

  if (status === 403) return new RpcForbiddenError();

  if (status === 404) return new RpcNotFoundError();

  return new RpcUnavailableError({ message: `API answered ${status}` });
};

const isStatusFailure = Schema.is(
  Schema.Union([
    RpcUnauthorizedError,
    RpcForbiddenError,
    RpcNotFoundError,
    RpcUnavailableError,
  ]),
);

const memberCalls =
  (inProcessFetch: typeof globalThis.fetch) =>
  <A, E>(actor: MemberActor, call: Effect.Effect<A, E, RpcActor>) =>
    call.pipe(
      Effect.provideService(RpcActor, actor),
      Effect.provideService(FetchHttpClient.Fetch, inProcessFetch),
      Effect.mapError((error) =>
        isStatusFailure(error)
          ? error
          : new RpcUnavailableError({ message: "In-process API call failed" }),
      ),
    );

const auraGrantsUnavailable = <A>(
  operation: Effect.Effect<A, CharacterAurasOperationError>,
) =>
  Effect.catchTag(operation, "CharacterAurasOperationError", (error) =>
    Effect.logError("Character aura grant operation failed", error.cause).pipe(
      Effect.andThen(Effect.fail(new RpcUnavailableError())),
    ),
  );

const plansUnavailable = <A, E>(operation: Effect.Effect<A, E>) =>
  Effect.catch(operation, (error) =>
    Effect.logError("Plan entitlement operation failed", error).pipe(
      Effect.andThen(Effect.fail(new RpcUnavailableError())),
    ),
  );

const operatorUnavailable = (error: OrganizationOperatorFailure) =>
  Effect.logError("Organization operator call failed", error).pipe(
    Effect.andThen(Effect.fail(new RpcUnavailableError())),
  );

const operatorRead = <A>(
  effect: Effect.Effect<A, OrganizationOperatorFailure>,
) => Effect.catch(effect, operatorUnavailable);

const operatorTarget = <A>(
  effect: Effect.Effect<A, OrganizationOperatorFailure>,
) =>
  Effect.catch(
    effect,
    (error): Effect.Effect<never, RpcNotFoundError | RpcUnavailableError> =>
      error._tag === "OrganizationNotFound"
        ? Effect.fail(new RpcNotFoundError())
        : operatorUnavailable(error),
  );

const operatorRefresh = <A>(
  effect: Effect.Effect<A, OrganizationOperatorFailure>,
) =>
  Effect.catch(
    effect,
    (
      error,
    ): Effect.Effect<
      never,
      RpcBadRequestError | RpcNotFoundError | RpcUnavailableError
    > => {
      if (error._tag === "OrganizationSyncCooldown")
        return Effect.fail(
          new RpcBadRequestError({ message: "Discord sync refresh cooldown" }),
        );

      if (error._tag === "OrganizationNotFound")
        return Effect.fail(new RpcNotFoundError());

      return operatorUnavailable(error);
    },
  );

const makeApiRpcHandlers = <E, R>(routes: Layer.Layer<never, E, R>) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const withInternalGuilds = Effect.provideService(
        InternalGuildsData,
        yield* InternalGuildsData,
      );

      const auras = yield* CharacterAurasData;
      const organizations = yield* OrganizationOperatorData;
      const plans = yield* UserPlansData;

      const context = (yield* Effect.context<
        Exclude<
          R,
          | HttpRouter.HttpRouter
          | HttpRouter.Provided
          | HttpRouter.Request<string, unknown>
          | Layer.Success<typeof HttpServer.layerServices>
        >
      >()).pipe(Context.omit(HttpRouter.HttpRouter));

      const web = yield* Effect.acquireRelease(
        Effect.sync(() =>
          HttpRouter.toWebHandler(
            Layer.mergeAll(
              // SAFETY: ProcessHandlerInfrastructure services are provided via `context`, leaving only HttpRouter/HttpServer provided by `toWebHandler`.
              routes.pipe(
                Layer.provide(Layer.succeedContext(context)),
              ) as Layer.Layer<never, E, HttpRouter.HttpRouter>,
              HttpServer.layerServices,
            ),
            { disableLogger: true },
          ),
        ),
        (boundary) => Effect.promise(() => boundary.dispose()),
      );

      const inProcessFetch = Object.assign(
        (input: string | URL | Request, init?: RequestInit) =>
          web.handler(new Request(input, init)),
        { preconnect: () => {} },
      );

      const asMember = memberCalls(inProcessFetch);

      const inProcess = yield* HttpClient.HttpClient.pipe(
        Effect.provide(FetchHttpClient.layer),
      );

      const api = yield* HttpApiClient.makeWith(LootlogApi, {
        baseUrl: "http://api.internal",
        httpClient: inProcess.pipe(
          HttpClient.mapRequestEffect((request) =>
            Effect.map(RpcActor, (actor) =>
              HttpClientRequest.setHeaders(request, {
                [AUTH_USER_ID_HEADER]: actor.userId,
                [AUTH_DISCORD_ID_HEADER]: actor.discordId,
              }),
            ),
          ),
          HttpClient.transformResponse(
            Effect.flatMap((response) =>
              response.status >= 200 && response.status < 300
                ? Effect.succeed(response)
                : Effect.fail(statusFailure(response.status)),
            ),
          ),
        ),
      });

      const memberHandlers = ApiRpcGroup.toLayer({
        getUserGuildPermissions: (query) =>
          getUserGuildPermissions(query).pipe(withInternalGuilds),
        getGuildByIdOrVanityUrl: (lookup) =>
          getGuildByIdOrVanityUrl(lookup).pipe(withInternalGuilds),
        getMemberIdentity: (lookup) =>
          getMemberIdentity(lookup).pipe(withInternalGuilds),
        getUserLimits: ({ userId }) => plansUnavailable(plans.limits(userId)),
        getUserAccessibleGuilds: (actor) =>
          asMember(actor, api.users.UsersControllerGetCurrentUserGuilds()).pipe(
            Effect.catchTags({
              RpcForbiddenError: () => Effect.fail(new RpcUnavailableError()),
              RpcNotFoundError: () => Effect.fail(new RpcUnavailableError()),
            }),
          ),
        listGuildEvents: ({ guildId, ...actor }) =>
          asMember(
            actor,
            api.events.listEvents({ params: { guildId }, query: {} }),
          ),
        getEventRanking: ({ guildId, eventId, ...actor }) =>
          asMember(
            actor,
            api.events.listEventRanking({ params: { guildId, eventId } }),
          ),
        getEventTimers: ({ guildId, eventId, world, ...actor }) =>
          asMember(
            actor,
            api.events.listEventHeroTimers({
              params: { guildId, eventId },
              query: { world },
            }),
          ),
        getEventWrapped: ({ guildId, eventId, ...actor }) =>
          asMember(
            actor,
            api.events.showEventWrapped({ params: { guildId, eventId } }),
          ),
        listGuildTimers: ({ guildId, world, ...actor }) =>
          asMember(
            actor,
            api.timers.TimersControllerGetTimers({
              params: { guildId },
              query: defined({ world }),
            }),
          ),
        getGuildKillStats: ({ guildId, period, npcTypes, ...actor }) =>
          asMember(
            actor,
            api.kills.KillsControllerGetGuildKillStats({
              params: { guildId },
              query: defined({ period, npcTypes }),
            }),
          ),
        getGuildTopKilledNpcs: ({ guildId, limit, search, period, ...actor }) =>
          asMember(
            actor,
            api.kills.KillsControllerGetGuildTopNpcs({
              params: { guildId },
              query: defined({ limit, search, period }),
            }),
          ),
        getNpcKillers: ({ guildId, npcId, limit, period, ...actor }) =>
          asMember(
            actor,
            api.kills.KillsControllerGetNpcKillers({
              params: { guildId, npcId: String(npcId) },
              query: defined({ limit, period }),
            }),
          ),
        listGuildLoots: ({
          guildId,
          limit,
          players,
          npcs,
          rarities,
          itemNames,
          ...actor
        }) =>
          asMember(
            actor,
            api.loots.LootsControllerFetchLootsByGuildId({
              params: { guildId },
              query: defined({ limit, players, npcs, rarities, itemNames }),
            }),
          ),
        listUserReservations: ({ status, ...actor }) =>
          asMember(
            actor,
            api.reservations.listMyReservations({ query: defined({ status }) }),
          ),
        listGuildReservationSpots: ({ guildId, ...actor }) =>
          asMember(
            actor,
            api.reservations.listReservationSpots({ params: { guildId } }),
          ),
        getGuildStatsCard: ({ guildId }) =>
          Effect.tryPromise({
            try: async () => {
              const response = await inProcessFetch(
                `http://api.internal/public/guilds/${encodeURIComponent(guildId)}/stats-card.png`,
              );

              return {
                status: response.status,
                body: new Uint8Array(await response.arrayBuffer()),
              };
            },
            catch: () =>
              new RpcUnavailableError({
                message: "In-process API call failed",
              }),
          }).pipe(
            Effect.flatMap(
              ({
                status,
                body,
              }): Effect.Effect<
                Uint8Array,
                RpcNotFoundError | RpcUnavailableError
              > => {
                if (status === 200) return Effect.succeed(body);

                if (status === 404) return Effect.fail(new RpcNotFoundError());

                return Effect.fail(
                  new RpcUnavailableError({
                    message: `API answered ${status}`,
                  }),
                );
              },
            ),
          ),
      });

      const operatorHandlers = ApiOperatorRpcGroup.toLayer({
        listCharacterAuraGrantHolders: () =>
          auraGrantsUnavailable(auras.listGrantHolders),
        getCharacterAuraGrants: ({ userId }) =>
          auraGrantsUnavailable(auras.getGrants(userId)),
        grantPersonalCharacterAura: ({ operatorUserId, userId, auraId }) =>
          auraGrantsUnavailable(
            auras.grantPersonalAura(operatorUserId, userId, auraId),
          ),
        revokePersonalCharacterAuras: ({ userId }) =>
          auraGrantsUnavailable(auras.revokePersonalAuras(userId)),
        getUserEntitlement: ({ userId }) => plansUnavailable(plans.get(userId)),
        setUserEntitlement: ({ operatorUserId, userId, change }) =>
          plansUnavailable(plans.set(operatorUserId, userId, change)),
        getOrganizationsOverview: () => operatorRead(organizations.getOverview),
        searchOrganizations: (search) =>
          operatorRead(organizations.searchOrganizations(search)),
        getOrganization: ({ guildId }) =>
          operatorTarget(organizations.getOrganization(guildId)),
        listOrganizationMembers: (query) =>
          operatorTarget(organizations.listMembers(query)),
        listUserOrganizations: ({ discordId }) =>
          operatorRead(organizations.listUserOrganizations(discordId)),
        listOrganizationAudit: ({ limit, offset }) =>
          operatorRead(organizations.listAudit(limit, offset)),
        setOrganizationEntitlement: ({ change, ...operator }) =>
          operatorTarget(organizations.setEntitlement(operator, change)),
        clearOrganizationVanityUrl: (operator) =>
          operatorTarget(organizations.clearVanityUrl(operator)),
        refreshOrganizationDiscordSync: (operator) =>
          operatorRefresh(organizations.refreshDiscordSync(operator)),
        suspendOrganization: ({ reason, ...operator }) =>
          operatorTarget(organizations.suspend(operator, reason)),
        resumeOrganization: (operator) =>
          operatorTarget(organizations.resume(operator)),
      });

      return Layer.merge(memberHandlers, operatorHandlers);
    }),
  );

export const makeApiRpcRoutes = <E, R>(routes: Layer.Layer<never, E, R>) =>
  Layer.unwrap(
    Effect.map(ApiRuntimeConfig, (config) =>
      serviceRpcRoutes({
        group: ApiServedRpcGroup,
        handlers: makeApiRpcHandlers(routes),
        callerTokens: config.rpc.callerTokens,
        spanPrefix: "api.rpc",
      }),
    ),
  );

export const makeApiRpcServer = <E, R>(routes: Layer.Layer<never, E, R>) =>
  Layer.unwrap(
    Effect.map(ApiRuntimeConfig, (config) =>
      serviceRpcServer({
        group: ApiServedRpcGroup,
        handlers: makeApiRpcHandlers(routes),
        callerTokens: config.rpc.callerTokens,
        port: config.rpc.port,
        spanPrefix: "api.rpc",
      }),
    ),
  );
