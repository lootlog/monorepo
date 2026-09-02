import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import {
  Permission,
  type Permission as PermissionValue,
} from "@lootlog/schema/permissions";
import type { MembersService } from "#src/members/members.service";
import type { MemberReadService } from "#src/members/member-read.service";
import type { MemberRefreshJobReadService } from "#src/members/member-refresh-job-read.service";
import {
  LootlogApi,
  MembersControllerDeactivateMember200,
  MembersControllerGetGuildMemberReferences200,
  MembersControllerGetGuildMembers200,
  MembersControllerGetGuildMembersSummary200,
  MembersControllerGetLatestRefreshJob200,
  MembersControllerGetMe200,
  MembersControllerGetMemberLootlogConfigSummary200,
  MembersControllerGetRefreshJobStatus200,
  MembersControllerRefreshAllMembers201,
  MembersControllerRefreshMe200,
  MembersControllerRefreshMember200,
} from "../../lootlog-api.generated.js";

export type MembersIdentity = {
  readonly userId: string;
  readonly discordId: string;
};

export type MembersGuildAccess = MembersIdentity & {
  readonly guildId: string;
  readonly permissions: ReadonlyArray<PermissionValue>;
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MembersAccessDenied extends Schema.TaggedError<MembersAccessDenied>()(
  "MembersAccessDenied",
  { status: Schema.Literals([401, 403]), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MembersNotFound extends Schema.TaggedError<MembersNotFound>()(
  "MembersNotFound",
  { status: Schema.Literal(404), code: Schema.String },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class MembersOperationError extends Schema.TaggedError<MembersOperationError>()(
  "MembersOperationError",
  { cause: Schema.Defect() },
) {}

type AccessFailure = MembersAccessDenied | MembersNotFound;

export class MembersAuthorization extends Context.Service<
  MembersAuthorization,
  {
    readonly identity: Effect.Effect<MembersIdentity, MembersAccessDenied>;
    readonly requireGuild: (options: {
      readonly guildId: string;
      readonly anyOf: ReadonlyArray<PermissionValue>;
    }) => Effect.Effect<MembersGuildAccess, AccessFailure>;
  }
>()("@lootlog/api/http-api/members/authorization") {}

type DataEffect = Effect.Effect<unknown, MembersOperationError>;

export class MembersData extends Context.Service<
  MembersData,
  {
    readonly getMe: (
      identity: MembersIdentity,
      guildId: string,
      refresh: boolean,
    ) => DataEffect;
    readonly refreshMember: (guildId: string, discordId: string) => DataEffect;
    readonly deactivateMember: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
    readonly refreshAllMembers: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/members/data") {
  static makeServices(services: {
    readonly access: Pick<
      MembersService,
      "getGuildMemberById" | "refreshMember"
    >;
    readonly removal: Pick<MembersService, "deactivateMember">;
    readonly bulkRefresh: Pick<MembersService, "createBulkRefreshJob">;
  }): MembersData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new MembersOperationError({ cause }),
      });

    return MembersData.of({
      getMe: ({ userId, discordId }, guildId, refresh) =>
        attempt(() =>
          services.access.getGuildMemberById({
            userId,
            discordId,
            guildId,
            standalone: true,
            ...(refresh ? { refresh: true } : {}),
          }),
        ),
      refreshMember: (guildId, discordId) =>
        attempt(() => services.access.refreshMember({ guildId, discordId })),
      deactivateMember: (guildId, discordId) =>
        attempt(() =>
          services.removal.deactivateMember({ guildId, discordId }),
        ),
      refreshAllMembers: (guildId, discordId) =>
        attempt(() =>
          services.bulkRefresh.createBulkRefreshJob(guildId, discordId),
        ),
    });
  }

  static layerService(service: MembersService) {
    return Layer.succeed(
      MembersData,
      MembersData.makeServices({
        access: service,
        removal: service,
        bulkRefresh: service,
      }),
    );
  }
}

export class MemberRefreshJobData extends Context.Service<
  MemberRefreshJobData,
  {
    readonly getLatestRefreshJob: (guildId: string) => DataEffect;
    readonly getRefreshJobStatus: (
      guildId: string,
      jobId: number,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/member-refresh-job/data") {
  static makeService(
    service: MemberRefreshJobReadService,
  ): MemberRefreshJobData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new MembersOperationError({ cause }),
      });
    return MemberRefreshJobData.of({
      getLatestRefreshJob: (guildId) =>
        attempt(() => service.getLatest(guildId)),
      getRefreshJobStatus: (guildId, jobId) =>
        attempt(() => service.get(guildId, jobId)),
    });
  }
}

export class MemberReadData extends Context.Service<
  MemberReadData,
  {
    readonly getLootlogConfigSummary: (
      guildId: string,
      discordId: string,
    ) => DataEffect;
    readonly getGuildMembers: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect;
    readonly getGuildMemberReferences: (
      guildId: string,
      includeInactive: boolean,
    ) => DataEffect;
    readonly getGuildMembersSummary: (guildId: string) => DataEffect;
  }
>()("@lootlog/api/http-api/member-read/data") {
  static makeService(service: MemberReadService): MemberReadData["Service"] {
    const attempt = (operation: () => PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new MembersOperationError({ cause }),
      });
    return MemberReadData.of({
      getLootlogConfigSummary: (guildId, discordId) =>
        attempt(() =>
          service.getMemberLootlogConfigSummary({ guildId, discordId }),
        ),
      getGuildMembers: (guildId, includeInactive) =>
        attempt(() => service.getGuildMembers(guildId, includeInactive)),
      getGuildMemberReferences: (guildId, includeInactive) =>
        attempt(() =>
          service.getGuildMemberReferences(guildId, includeInactive),
        ),
      getGuildMembersSummary: (guildId) =>
        attempt(() => service.getGuildMembersSummary(guildId)),
    });
  }
}

const identity = Effect.flatMap(
  MembersAuthorization,
  (service) => service.identity,
);

const requireGuild = (guildId: string, anyOf: ReadonlyArray<PermissionValue>) =>
  Effect.flatMap(MembersAuthorization, (service) =>
    service.requireGuild({ guildId, anyOf }),
  );

const data = <A>(
  operation: (
    service: MembersData["Service"],
  ) => Effect.Effect<A, MembersOperationError>,
) => Effect.flatMap(MembersData, operation);

const readData = <A>(
  operation: (
    service: MemberReadData["Service"],
  ) => Effect.Effect<A, MembersOperationError>,
) => Effect.flatMap(MemberReadData, operation);

const refreshJobData = <A>(
  operation: (
    service: MemberRefreshJobData["Service"],
  ) => Effect.Effect<A, MembersOperationError>,
) => Effect.flatMap(MemberRefreshJobData, operation);

const toWire = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toWire);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, toWire(nested)]),
  );
};

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(toWire(value)).pipe(
    Effect.mapError((cause) => new MembersOperationError({ cause })),
  );

const defectCause = (error: unknown) =>
  error instanceof MembersOperationError ? error.cause : error;

const errorStatus = (error: unknown): number | undefined => {
  if (
    error instanceof MembersAccessDenied ||
    error instanceof MembersNotFound
  ) {
    return error.status;
  }
  const cause = defectCause(error);
  if (
    typeof cause === "object" &&
    cause !== null &&
    "getStatus" in cause &&
    typeof cause.getStatus === "function"
  ) {
    return cause.getStatus();
  }
  return undefined;
};

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

const declaredEmptyError = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  statuses: ReadonlyArray<number>,
) =>
  Effect.catch(effect, (error) =>
    statuses.includes(errorStatus(error) ?? 0)
      ? Effect.fail(undefined)
      : Effect.die(defectCause(error)),
  );

const pathString = (value: unknown, name: string) =>
  typeof value === "string"
    ? Effect.succeed(value)
    : Effect.die(new TypeError(`${name} path parameter must be a string`));

export const getCurrentMember = Effect.fn("getCurrentMember")(function* (
  guildId: string,
  refresh = false,
) {
  const current = yield* identity;
  const value = yield* data((service) =>
    service.getMe(current, guildId, refresh),
  );
  return yield* decode(
    refresh ? MembersControllerRefreshMe200 : MembersControllerGetMe200,
    value,
  );
});

export const refreshGuildMember = Effect.fn("refreshGuildMember")(function* (
  guildId: string,
  discordId: string,
) {
  const access = yield* requireGuild(guildId, [
    Permission.ADMIN,
    Permission.OWNER,
  ]);
  const value = yield* data((service) =>
    service.refreshMember(access.guildId, discordId),
  );
  return yield* decode(MembersControllerRefreshMember200, value);
});

export const deactivateGuildMember = Effect.fn("deactivateGuildMember")(
  function* (guildId: string, discordId: string) {
    const access = yield* requireGuild(guildId, [
      Permission.ADMIN,
      Permission.OWNER,
    ]);
    const value = yield* data((service) =>
      service.deactivateMember(access.guildId, discordId),
    );
    return yield* decode(MembersControllerDeactivateMember200, value);
  },
);

export const MembersHandlers = HttpApiBuilder.group(
  LootlogApi,
  "members",
  (handlers) =>
    handlers
      .handle("MembersControllerGetMe", ({ params }) =>
        declaredEmptyError(getCurrentMember(params.guildId), [404]),
      )
      .handle("MembersControllerRefreshMe", ({ params }) =>
        orDieHttpFailure(getCurrentMember(params.guildId, true)),
      )
      .handle("MembersControllerRefreshMember", ({ params }) =>
        declaredEmptyError(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            refreshGuildMember(guildId, params.discordId),
          ),
          [403, 404],
        ),
      )
      .handle("MembersControllerDeactivateMember", ({ params }) =>
        declaredEmptyError(
          Effect.flatMap(pathString(params.guildId, "guildId"), (guildId) =>
            deactivateGuildMember(guildId, params.discordId),
          ),
          [403, 404],
        ),
      )
      .handle("MembersControllerGetMemberLootlogConfigSummary", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.ADMIN,
              Permission.OWNER,
            ]);
            const value = yield* readData((service) =>
              service.getLootlogConfigSummary(access.guildId, params.discordId),
            );
            return yield* decode(
              MembersControllerGetMemberLootlogConfigSummary200,
              value,
            );
          }),
          [403, 404],
        ),
      )
      .handle("MembersControllerGetGuildMembers", ({ params, query }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.LOOTLOG_ACCESS,
            ]);
            if (query.includeInactive === true) {
              yield* requireGuild(guildId, [
                Permission.ADMIN,
                Permission.OWNER,
              ]);
            }
            const value = yield* readData((service) =>
              service.getGuildMembers(
                access.guildId,
                query.includeInactive === true,
              ),
            );
            return yield* decode(MembersControllerGetGuildMembers200, value);
          }),
          [403],
        ),
      )
      .handle(
        "MembersControllerGetGuildMemberReferences",
        ({ params, query }) =>
          declaredEmptyError(
            Effect.gen(function* () {
              const guildId = yield* pathString(params.guildId, "guildId");
              const access = yield* requireGuild(guildId, [
                Permission.LOOTLOG_ACCESS,
              ]);
              const value = yield* readData((service) =>
                service.getGuildMemberReferences(
                  access.guildId,
                  query.includeInactive === true,
                ),
              );
              return yield* decode(
                MembersControllerGetGuildMemberReferences200,
                value,
              );
            }),
            [403],
          ),
      )
      .handle("MembersControllerGetGuildMembersSummary", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.LOOTLOG_ACCESS,
            ]);
            const value = yield* readData((service) =>
              service.getGuildMembersSummary(access.guildId),
            );
            return yield* decode(
              MembersControllerGetGuildMembersSummary200,
              value,
            );
          }),
          [403],
        ),
      )
      .handle("MembersControllerRefreshAllMembers", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.ADMIN,
              Permission.OWNER,
            ]);
            const value = yield* data((service) =>
              service.refreshAllMembers(access.guildId, access.discordId),
            );
            return yield* decode(MembersControllerRefreshAllMembers201, value);
          }),
          [403],
        ),
      )
      .handle("MembersControllerGetLatestRefreshJob", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.ADMIN,
              Permission.OWNER,
            ]);
            const value = yield* refreshJobData((service) =>
              service.getLatestRefreshJob(access.guildId),
            );
            return yield* decode(
              MembersControllerGetLatestRefreshJob200,
              value,
            );
          }),
          [403, 404],
        ),
      )
      .handle("MembersControllerGetRefreshJobStatus", ({ params }) =>
        declaredEmptyError(
          Effect.gen(function* () {
            const guildId = yield* pathString(params.guildId, "guildId");
            const access = yield* requireGuild(guildId, [
              Permission.ADMIN,
              Permission.OWNER,
            ]);
            const value = yield* refreshJobData((service) =>
              service.getRefreshJobStatus(access.guildId, params.jobId),
            );
            return yield* decode(
              MembersControllerGetRefreshJobStatus200,
              value,
            );
          }),
          [403, 404],
        ),
      ),
);
