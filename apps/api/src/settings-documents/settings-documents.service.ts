import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";
import { isRecord } from "@lootlog/schema/records";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getCharacterSettingsScopeId,
  isSettingsDomain,
} from "@lootlog/domain/settings-documents";
import {
  GUILD_SETTINGS_DOCUMENTS_MAX_GUILDS,
  type PatchSettingsDocuments,
  type SettingsDocumentLayer,
  SettingsDomain,
  SettingsDomainResolution,
  SettingsScope,
  SettingsScopeType,
} from "@lootlog/schema/settings-documents";
import { Effect, Schema } from "effect";
import {
  InvalidSettingsPatchError,
  type SettingsDocumentsRepositoryService,
  SettingsPersistenceError,
} from "./settings-documents.repository.js";
import { resolveSettingsDomain } from "./settings-resolver.js";

export interface SettingsContext {
  domains: SettingsDomain[];
  gameAccountId?: string;
  characterId?: string;
  characterScopeId?: string;
  guildId?: string;
}

export interface SettingsDocumentsResponse {
  domains: Partial<Record<SettingsDomain, SettingsDomainResolution>>;
}

export interface GuildSettingsContext {
  domains: SettingsDomain[];
  guildIds: string[];
}

export interface GuildSettingsDocumentsResponse {
  guilds: Record<string, SettingsDocumentsResponse>;
}

export type SettingsDocumentsFailure =
  | SettingsRequestError
  | SettingsPersistenceError;

export interface SettingsDocuments {
  readonly getPreferences: (
    userId: string,
    context: SettingsContext,
  ) => Effect.Effect<SettingsDocumentsResponse, SettingsDocumentsFailure>;
  /**
   * Guild-scoped documents for every listed guild the user is an active
   * member of; other guilds are left out instead of failing the request.
   */
  readonly getGuildPreferences: (
    userId: string,
    context: GuildSettingsContext,
  ) => Effect.Effect<GuildSettingsDocumentsResponse, SettingsDocumentsFailure>;
  readonly patchPreferences: (
    userId: string,
    payload: PatchSettingsDocuments,
  ) => Effect.Effect<SettingsDocumentsResponse, SettingsDocumentsFailure>;
  readonly parseDomains: (
    domainsValue: string,
  ) => Effect.Effect<SettingsDomain[], SettingsRequestError>;
  readonly parseGuildIds: (
    guildIdsValue: string,
  ) => Effect.Effect<string[], SettingsRequestError>;
}

const requestError = (status: 400 | 403, message: string) =>
  new SettingsRequestError({ status, message });

const getContextScopes = (
  userId: string,
  context: Omit<SettingsContext, "domains">,
): Effect.Effect<SettingsScope[], SettingsRequestError> => {
  let characterScopeId = context.characterScopeId;

  if (!characterScopeId && context.characterId) {
    if (!context.gameAccountId) {
      return Effect.fail(
        requestError(400, "Character settings require a game account context"),
      );
    }

    characterScopeId = getCharacterSettingsScopeId(
      context.gameAccountId,
      context.characterId,
    );
  }

  return Effect.succeed([
    { type: "USER", id: userId } as const,
    ...(context.gameAccountId
      ? [
          {
            type: "GAME_ACCOUNT",
            id: context.gameAccountId,
          } as const,
        ]
      : []),
    ...(characterScopeId
      ? [{ type: "CHARACTER", id: characterScopeId } as const]
      : []),
    ...(context.guildId
      ? [{ type: "GUILD", id: context.guildId } as const]
      : []),
  ]);
};

const getContextFromOperations = (
  operations: PatchSettingsDocuments["operations"],
): SettingsContext => {
  const scopes = new Map<SettingsScopeType, string>();

  for (const operation of operations) {
    scopes.set(operation.scope.type, operation.scope.id);
  }

  return {
    domains: [...new Set(operations.map((operation) => operation.domain))],
    gameAccountId: scopes.get("GAME_ACCOUNT"),
    characterScopeId: scopes.get("CHARACTER"),
    guildId: scopes.get("GUILD"),
  };
};

const getOperationKey = (
  operation: PatchSettingsDocuments["operations"][number],
) => `${operation.domain}:${operation.scope.type}:${operation.scope.id}`;

const validateOperationUniqueness = (
  operations: PatchSettingsDocuments["operations"],
): Effect.Effect<void, SettingsRequestError> =>
  Effect.gen(function* () {
    const operationKeys = new Set<string>();
    const scopeIds = new Map<SettingsScopeType, string>();

    for (const operation of operations) {
      const operationKey = getOperationKey(operation);

      if (operationKeys.has(operationKey)) {
        return yield* requestError(
          400,
          `Duplicate settings operation: ${operationKey}`,
        );
      }

      operationKeys.add(operationKey);

      const existingScopeId = scopeIds.get(operation.scope.type);

      if (existingScopeId && existingScopeId !== operation.scope.id) {
        return yield* requestError(
          400,
          `A settings batch cannot contain multiple ${operation.scope.type} scopes`,
        );
      }

      scopeIds.set(operation.scope.type, operation.scope.id);
    }
  });

const validateScopes = (
  repository: SettingsDocumentsRepositoryService,
  userId: string,
  scopes: ReadonlyArray<SettingsScope>,
): Effect.Effect<void, SettingsDocumentsFailure> =>
  Effect.gen(function* () {
    const access = yield* requestApiKeyAccess;

    for (const scope of scopes) {
      if (scope.type === "USER" && scope.id !== userId) {
        return yield* requestError(
          403,
          "Cannot access another user's settings",
        );
      }

      if (scope.type === "GUILD") {
        if (access && !access.organizationIds.includes(scope.id)) {
          return yield* requestError(
            403,
            "Guild settings are outside the API key scope",
          );
        }

        const isMember = yield* repository.hasActiveGuildMembership(
          userId,
          scope.id,
        );

        if (!isMember) {
          return yield* requestError(403, "Guild settings are not accessible");
        }
      }
    }
  });

type StoredDocuments = Effect.Success<
  ReturnType<SettingsDocumentsRepositoryService["findDocuments"]>
>;

/** Resolves each domain from the stored documents matching `scopes`, in order. */
const resolveDomains = (
  domains: SettingsDomain[],
  scopes: ReadonlyArray<SettingsScope>,
  documents: StoredDocuments,
): SettingsDocumentsResponse["domains"] => {
  const resolved: SettingsDocumentsResponse["domains"] = {};

  for (const domain of domains) {
    const layers: SettingsDocumentLayer[] = scopes.flatMap((scope) => {
      const document = documents.find(
        (candidate) =>
          candidate.domain === domain &&
          candidate.scopeType === scope.type &&
          candidate.scopeId === scope.id,
      );

      return document
        ? [
            {
              scope,
              overrides: isRecord(document.overrides) ? document.overrides : {},
              schemaVersion: document.schemaVersion,
              updatedAt: document.updatedAt,
            },
          ]
        : [];
    });

    resolved[domain] = resolveSettingsDomain(domain, layers);
  }

  return resolved;
};

export const makeSettingsDocuments = (
  repository: SettingsDocumentsRepositoryService,
): SettingsDocuments => {
  const getPreferences: SettingsDocuments["getPreferences"] = (
    userId,
    context,
  ) =>
    Effect.gen(function* () {
      const scopes = yield* getContextScopes(userId, context);
      yield* validateScopes(repository, userId, scopes);

      const documents = yield* repository.findDocuments(
        userId,
        context.domains,
        scopes,
      );

      return { domains: resolveDomains(context.domains, scopes, documents) };
    });

  const getGuildPreferences: SettingsDocuments["getGuildPreferences"] = (
    userId,
    context,
  ) =>
    Effect.gen(function* () {
      const access = yield* requestApiKeyAccess;
      const guildIds = [...new Set(context.guildIds)];

      if (
        access &&
        guildIds.some((guildId) => !access.organizationIds.includes(guildId))
      ) {
        return yield* requestError(
          403,
          "Guild settings are outside the API key scope",
        );
      }

      const memberGuildIds = yield* repository.findActiveGuildMemberships(
        userId,
        guildIds,
      );

      const userScope: SettingsScope = { type: "USER", id: userId };

      const guildScopes: SettingsScope[] = memberGuildIds.map((guildId) => ({
        type: "GUILD",
        id: guildId,
      }));

      // Each guild resolves over the same layers as a single-guild read:
      // the user document first, then the guild document.
      const documents =
        guildScopes.length === 0
          ? []
          : yield* repository.findDocuments(userId, context.domains, [
              userScope,
              ...guildScopes,
            ]);

      const guilds: GuildSettingsDocumentsResponse["guilds"] = {};

      for (const scope of guildScopes) {
        guilds[scope.id] = {
          domains: resolveDomains(
            context.domains,
            [userScope, scope],
            documents,
          ),
        };
      }

      return { guilds };
    });

  const patchPreferences: SettingsDocuments["patchPreferences"] = (
    userId,
    payload,
  ) =>
    Effect.gen(function* () {
      yield* validateOperationUniqueness(payload.operations);
      const scopes = payload.operations.map((operation) => operation.scope);
      yield* validateScopes(repository, userId, scopes);

      const sortedOperations = [...payload.operations].sort((left, right) =>
        getOperationKey(left).localeCompare(getOperationKey(right)),
      );

      yield* repository
        .applyOperations(userId, sortedOperations)
        .pipe(
          Effect.mapError((error) =>
            error instanceof InvalidSettingsPatchError
              ? requestError(400, error.message)
              : error,
          ),
        );

      const operationsContext = getContextFromOperations(payload.operations);

      // A client that sends its read context gets the documents resolved the
      // way it reads them, so the response can replace its cache entry.
      return yield* getPreferences(
        userId,
        payload.context
          ? {
              domains: operationsContext.domains,
              gameAccountId: payload.context.gameAccountId,
              characterId: payload.context.characterId,
              guildId: payload.context.guildId,
            }
          : operationsContext,
      );
    });

  return {
    getPreferences,
    getGuildPreferences,
    patchPreferences,
    parseGuildIds: (guildIdsValue) => {
      const guildIds = [
        ...new Set(
          guildIdsValue
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0),
        ),
      ];

      return guildIds.length === 0
        ? Effect.fail(requestError(400, "At least one guild id is required"))
        : guildIds.length > GUILD_SETTINGS_DOCUMENTS_MAX_GUILDS
          ? Effect.fail(
              requestError(
                400,
                `At most ${GUILD_SETTINGS_DOCUMENTS_MAX_GUILDS} guild ids per request`,
              ),
            )
          : Effect.succeed(guildIds);
    },
    parseDomains: (domainsValue) => {
      const domains = [
        ...new Set(domainsValue.split(",").map((item) => item.trim())),
      ];

      return domains.length === 0 || !domains.every(isSettingsDomain)
        ? Effect.fail(requestError(400, "Unknown settings domain"))
        : Effect.succeed(domains);
    },
  };
};

export class SettingsRequestError extends TaggedErrorClass<SettingsRequestError>()(
  "SettingsRequestError",
  {
    status: Schema.Literals([400, 403]),
    message: Schema.String,
  },
) {
  getStatus() {
    return this.status;
  }
}
