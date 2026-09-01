import { db as prismaDb } from "../prisma/db.js";
import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { and, or } from "@prisma/orm-family-sql/orm-client";
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
import { PrismaService } from "#src/db/prisma.service";
import type { PatchSettingsDocumentsDto } from "./dto/settings-documents.dto.js";
import {
  applySettingsPatch,
  resolveSettingsDomain,
} from "./settings-resolver.js";
import { temporalToDate, dateToTemporal } from "#src/db/temporal";

type InputJsonValue = DatabaseJsonValue;
const PrismaSettingsScopeType =
  prismaDb.nativeEnums.public.SettingsScopeType.members;
type PrismaSettingsScopeType =
  (typeof PrismaSettingsScopeType)[keyof typeof PrismaSettingsScopeType];

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
  isRecord(error) &&
  (error.code === "40001" ||
    error.code === "40P01" ||
    error.code === "23505" ||
    error.code === "CONSTRAINT.UNIQUE");

@Injectable()
export class SettingsDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(
    userId: string,
    context: SettingsContext,
  ): Promise<SettingsDocumentsResponse> {
    const scopes = this.getContextScopes(userId, context);
    await this.validateScopes(userId, scopes);

    const documents = await this.prisma.db.orm.public.UserSettingDocument.where(
      (row) =>
        and(
          row.userId.eq(userId),
          row.domain.in(context.domains),
          or(
            ...scopes.map((scope) =>
              and(row.scopeType.eq(scope.type), row.scopeId.eq(scope.id)),
            ),
          ),
        ),
    )
      .orderBy([(row) => row.scopeType.asc(), (row) => row.scopeId.asc()])
      .all();

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
            updatedAt: temporalToDate(document.updatedAt).toISOString(),
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
        await this.prisma.db.transaction(async (transaction) => {
          await transaction.execute(
            this.prisma.db.raw.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
              .affectedCount()
              .build(),
          );

          for (const operation of sortedOperations) {
            const currentDocument =
              await transaction.orm.public.UserSettingDocument.where((row) =>
                and(
                  row.userId.eq(userId),
                  row.domain.eq(operation.domain),
                  row.scopeType.eq(operation.scope.type),
                  row.scopeId.eq(operation.scope.id),
                ),
              ).first();
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
                await transaction.orm.public.UserSettingDocument.where((row) =>
                  row.id.eq(currentDocument.id),
                ).delete();
              }
              continue;
            }

            const data = {
              overrides: nextOverrides as InputJsonValue,
              schemaVersion: SETTINGS_CATALOG[operation.domain].schemaVersion,
              updatedAt: dateToTemporal(new Date()),
            };

            if (currentDocument) {
              await transaction.orm.public.UserSettingDocument.where((row) =>
                row.id.eq(currentDocument.id),
              ).update(data);
              continue;
            }

            await transaction.orm.public.UserSettingDocument.where((row) =>
              and(
                row.userId.eq(userId),
                row.domain.eq(operation.domain),
                row.scopeType.eq(operation.scope.type),
                row.scopeId.eq(operation.scope.id),
              ),
            ).upsert({
              create: {
                userId,
                domain: operation.domain,
                scopeType: operation.scope.type as PrismaSettingsScopeType,
                scopeId: operation.scope.id,
                ...data,
                updatedAt: dateToTemporal(new Date()),
              },
              conflictOn: {
                userId,
                domain: operation.domain,
                scopeType: operation.scope.type as PrismaSettingsScopeType,
                scopeId: operation.scope.id,
              },
              update: data,
            });
          }
        });
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

      const member = await this.prisma.db.orm.public.Member.where((row) =>
        and(
          row.globalUserId.eq(userId),
          row.guildId.eq(scope.id),
          row.active.eq(true),
        ),
      )
        .select("id")
        .first();

      if (!member) {
        throw new ForbiddenException("Guild settings are not accessible");
      }
    }
  }
}
