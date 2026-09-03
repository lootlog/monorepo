import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  getCharacterSettingsScopeId,
  isSettingsDomain,
} from "@lootlog/domain/settings-documents";
import type {
  PatchSettingsDocuments,
  SettingsDocumentLayer,
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

type JsonRecord = Record<string, unknown>;

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

export type SettingsDocumentsFailure =
  | SettingsRequestError
  | SettingsPersistenceError;

export interface SettingsDocuments {
  readonly getPreferences: (
    userId: string,
    context: SettingsContext,
  ) => Effect.Effect<SettingsDocumentsResponse, SettingsDocumentsFailure>;
  readonly patchPreferences: (
    userId: string,
    payload: PatchSettingsDocuments,
  ) => Effect.Effect<SettingsDocumentsResponse, SettingsDocumentsFailure>;
  readonly parseDomains: (
    domainsValue: string,
  ) => Effect.Effect<SettingsDomain[], SettingsRequestError>;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    for (const scope of scopes) {
      if (scope.type === "USER" && scope.id !== userId) {
        return yield* requestError(
          403,
          "Cannot access another user's settings",
        );
      }
      if (scope.type === "GUILD") {
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
      const domains: SettingsDocumentsResponse["domains"] = {};

      for (const domain of context.domains) {
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
                  overrides: isRecord(document.overrides)
                    ? document.overrides
                    : {},
                  schemaVersion: document.schemaVersion,
                  updatedAt: document.updatedAt,
                },
              ]
            : [];
        });
        domains[domain] = resolveSettingsDomain(domain, layers);
      }

      return { domains };
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
      return yield* getPreferences(
        userId,
        getContextFromOperations(payload.operations),
      );
    });

  return {
    getPreferences,
    patchPreferences,
    parseDomains: (domainsValue) => {
      const domains = [
        ...new Set(domainsValue.split(",").map((item) => item.trim())),
      ];
      return domains.length === 0 ||
        domains.some((domain) => !isSettingsDomain(domain))
        ? Effect.fail(requestError(400, "Unknown settings domain"))
        : Effect.succeed(domains as SettingsDomain[]);
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
