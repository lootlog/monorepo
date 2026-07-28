import {
  SETTINGS_CATALOG,
  getCharacterSettingsScopeId,
  isSettingsDomain,
  type SettingsDocumentLayer,
  type SettingsDomain,
  type SettingsDomainResolution,
  type SettingsScope,
  type SettingsScopeType,
} from "@lootlog/types";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  Prisma,
  type SettingsScopeType as PrismaSettingsScopeType,
} from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import type { PatchSettingsDocumentsDto } from "./dto/settings-documents.dto";
import { applySettingsPatch, resolveSettingsDomain } from "./settings-resolver";

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

const isRetryableTransactionError = (error: unknown) =>
  isRecord(error) && (error.code === "P2034" || error.code === "P2002");

@Injectable()
export class SettingsDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(
    userId: string,
    context: SettingsContext,
  ): Promise<SettingsDocumentsResponse> {
    const scopes = this.getContextScopes(userId, context);
    await this.validateScopes(userId, scopes);

    const documents = await this.prisma.userSettingDocument.findMany({
      where: {
        userId,
        domain: { in: context.domains },
        OR: scopes.map((scope) => ({
          scopeType: scope.type as PrismaSettingsScopeType,
          scopeId: scope.id,
        })),
      },
      orderBy: [{ scopeType: "asc" }, { scopeId: "asc" }],
    });

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

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.prisma.$transaction(
          async (transaction) => {
            for (const operation of sortedOperations) {
              await transaction.$queryRaw(
                Prisma.sql`
                  SELECT "id"
                  FROM "UserSettingDocument"
                  WHERE "userId" = ${userId}
                    AND "domain" = ${operation.domain}
                    AND "scopeType" = ${operation.scope.type}::"SettingsScopeType"
                    AND "scopeId" = ${operation.scope.id}
                  FOR UPDATE
                `,
              );
            }

            for (const operation of sortedOperations) {
              const where = {
                userId_domain_scopeType_scopeId: {
                  userId,
                  domain: operation.domain,
                  scopeType: operation.scope.type as PrismaSettingsScopeType,
                  scopeId: operation.scope.id,
                },
              };
              const currentDocument =
                await transaction.userSettingDocument.findUnique({ where });
              const currentOverrides = isRecord(currentDocument?.overrides)
                ? currentDocument.overrides
                : {};
              let nextOverrides: JsonRecord;
              try {
                nextOverrides = applySettingsPatch({
                  domain: operation.domain,
                  scope: operation.scope,
                  currentOverrides,
                  set: operation.set,
                  unset: operation.unset,
                });
              } catch (error) {
                throw new BadRequestException(
                  error instanceof Error
                    ? error.message
                    : "Invalid settings operation",
                );
              }

              if (Object.keys(nextOverrides).length === 0) {
                if (currentDocument) {
                  await transaction.userSettingDocument.delete({ where });
                }
                continue;
              }

              const data = {
                overrides: nextOverrides as Prisma.InputJsonValue,
                schemaVersion: SETTINGS_CATALOG[operation.domain].schemaVersion,
              };

              if (currentDocument) {
                await transaction.userSettingDocument.update({
                  where,
                  data,
                });
                continue;
              }

              await transaction.userSettingDocument.upsert({
                where,
                create: {
                  userId,
                  domain: operation.domain,
                  scopeType: operation.scope.type as PrismaSettingsScopeType,
                  scopeId: operation.scope.id,
                  ...data,
                },
                update: data,
              });
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
        break;
      } catch (error) {
        if (attempt === 2 || !isRetryableTransactionError(error)) {
          throw error;
        }
      }
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

      const member = await this.prisma.member.findFirst({
        where: {
          globalUserId: userId,
          guildId: scope.id,
          active: true,
        },
        select: { id: true },
      });

      if (!member) {
        throw new ForbiddenException("Guild settings are not accessible");
      }
    }
  }
}
