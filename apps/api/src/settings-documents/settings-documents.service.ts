import {
  getCharacterSettingsScopeId,
  isSettingsDomain,
} from "@lootlog/domain/settings-documents";
import type {
  SettingsDocumentLayer,
  SettingsDomain,
  SettingsDomainResolution,
  SettingsScope,
  SettingsScopeType,
} from "@lootlog/schema/settings-documents";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { PatchSettingsDocumentsDto } from "./dto/settings-documents.dto.js";
import {
  InvalidSettingsPatchError,
  SettingsDocumentsRepository,
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

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

@Injectable()
export class SettingsDocumentsService {
  constructor(private readonly repository: SettingsDocumentsRepository) {}

  async getPreferences(
    userId: string,
    context: SettingsContext,
  ): Promise<SettingsDocumentsResponse> {
    const scopes = this.getContextScopes(userId, context);
    await this.validateScopes(userId, scopes);

    const documents = await this.repository.findDocuments(
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

        if (!document) {
          return [];
        }

        return [
          {
            scope,
            overrides: isRecord(document.overrides) ? document.overrides : {},
            schemaVersion: document.schemaVersion,
            updatedAt: document.updatedAt.toISOString(),
          },
        ];
      });

      domains[domain] = resolveSettingsDomain(domain, layers);
    }

    return { domains };
  }

  async patchPreferences(
    userId: string,
    payload: PatchSettingsDocumentsDto,
  ): Promise<SettingsDocumentsResponse> {
    this.validateOperationUniqueness(payload.operations);
    const scopes = payload.operations.map((operation) => operation.scope);
    await this.validateScopes(userId, scopes);

    const sortedOperations = [...payload.operations].sort((left, right) =>
      this.getOperationKey(left).localeCompare(this.getOperationKey(right)),
    );

    try {
      await this.repository.applyOperations(userId, sortedOperations);
    } catch (error) {
      if (error instanceof InvalidSettingsPatchError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.getPreferences(
      userId,
      this.getContextFromOperations(userId, payload.operations),
    );
  }

  parseDomains(domainsValue: string): SettingsDomain[] {
    const domains = [
      ...new Set(domainsValue.split(",").map((item) => item.trim())),
    ];

    if (
      domains.length === 0 ||
      domains.some((domain) => !isSettingsDomain(domain))
    ) {
      throw new BadRequestException("Unknown settings domain");
    }

    return domains as SettingsDomain[];
  }

  private getContextScopes(
    userId: string,
    context: Omit<SettingsContext, "domains">,
  ): SettingsScope[] {
    let characterScopeId = context.characterScopeId;
    if (!characterScopeId && context.characterId) {
      if (!context.gameAccountId) {
        throw new BadRequestException(
          "Character settings require a game account context",
        );
      }
      characterScopeId = getCharacterSettingsScopeId(
        context.gameAccountId,
        context.characterId,
      );
    }

    return [
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
    ];
  }

  private getContextFromOperations(
    userId: string,
    operations: PatchSettingsDocumentsDto["operations"],
  ): SettingsContext {
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
  }

  private validateOperationUniqueness(
    operations: PatchSettingsDocumentsDto["operations"],
  ) {
    const operationKeys = new Set<string>();
    const scopeIds = new Map<SettingsScopeType, string>();

    for (const operation of operations) {
      const operationKey = this.getOperationKey(operation);
      if (operationKeys.has(operationKey)) {
        throw new BadRequestException(
          `Duplicate settings operation: ${operationKey}`,
        );
      }
      operationKeys.add(operationKey);

      const existingScopeId = scopeIds.get(operation.scope.type);
      if (existingScopeId && existingScopeId !== operation.scope.id) {
        throw new BadRequestException(
          `A settings batch cannot contain multiple ${operation.scope.type} scopes`,
        );
      }
      scopeIds.set(operation.scope.type, operation.scope.id);
    }
  }

  private getOperationKey(
    operation: PatchSettingsDocumentsDto["operations"][number],
  ) {
    return `${operation.domain}:${operation.scope.type}:${operation.scope.id}`;
  }

  private async validateScopes(userId: string, scopes: SettingsScope[]) {
    for (const scope of scopes) {
      if (scope.type === "USER" && scope.id !== userId) {
        throw new ForbiddenException("Cannot access another user's settings");
      }

      if (scope.type !== "GUILD") {
        continue;
      }

      if (!(await this.repository.hasActiveGuildMembership(userId, scope.id))) {
        throw new ForbiddenException("Guild settings are not accessible");
      }
    }
  }
}
