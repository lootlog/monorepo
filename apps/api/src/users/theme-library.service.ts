import {
  SETTINGS_CATALOG,
  ThemeLibrarySchema,
  createDefaultThemeLibrary,
  migrateSettingsDocument,
  normalizeThemeLibrary,
  type ThemeLibrary,
  type ThemePatchOperation,
} from "@lootlog/types";
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { Prisma, type SettingsScopeType } from "src/generated/prisma/client";
import type { PatchThemeLibraryDto } from "./dto/theme-library.dto";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRetryableTransactionError = (error: unknown) =>
  isRecord(error) && (error.code === "P2034" || error.code === "P2002");

@Injectable()
export class ThemeLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getThemeLibrary(userId: string): Promise<ThemeLibrary> {
    const document = await this.prisma.userSettingDocument.findUnique({
      where: this.getDocumentWhere(userId),
    });

    return this.readLibrary(document?.overrides, document?.schemaVersion);
  }

  patchThemeLibrary(
    userId: string,
    payload: PatchThemeLibraryDto,
  ): Promise<ThemeLibrary> {
    return this.executePatch(userId, payload, 0);
  }

  private async executePatch(
    userId: string,
    payload: PatchThemeLibraryDto,
    attempt: number,
  ): Promise<ThemeLibrary> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw(
            Prisma.sql`
                SELECT "id"
                FROM "UserSettingDocument"
                WHERE "userId" = ${userId}
                  AND "domain" = 'appearance'
                  AND "scopeType" = 'USER'::"SettingsScopeType"
                  AND "scopeId" = ${userId}
                FOR UPDATE
              `,
          );

          const document = await transaction.userSettingDocument.findUnique({
            where: this.getDocumentWhere(userId),
          });
          const currentLibrary = this.readLibrary(
            document?.overrides,
            document?.schemaVersion,
          );

          if (payload.revision !== currentLibrary.revision) {
            throw new ConflictException({
              code: "THEME_REVISION_CONFLICT",
              revision: currentLibrary.revision,
            });
          }

          const nextLibrary = this.applyOperations(
            currentLibrary,
            payload.operations,
          );
          const currentOverrides = this.readAppearanceOverrides(
            document?.overrides,
            document?.schemaVersion,
          );
          const nextOverrides = {
            ...currentOverrides,
            theme: nextLibrary,
          };

          await transaction.userSettingDocument.upsert({
            where: this.getDocumentWhere(userId),
            create: {
              userId,
              domain: "appearance",
              scopeType: "USER" as SettingsScopeType,
              scopeId: userId,
              schemaVersion: SETTINGS_CATALOG.appearance.schemaVersion,
              overrides: nextOverrides as Prisma.InputJsonValue,
            },
            update: {
              schemaVersion: SETTINGS_CATALOG.appearance.schemaVersion,
              overrides: nextOverrides as Prisma.InputJsonValue,
            },
          });

          return nextLibrary;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (attempt === 2 || !isRetryableTransactionError(error)) {
        throw error;
      }
      return this.executePatch(userId, payload, attempt + 1);
    }
  }

  private applyOperations(
    currentLibrary: ThemeLibrary,
    operations: ThemePatchOperation[],
  ): ThemeLibrary {
    let nextLibrary = structuredClone(currentLibrary);

    for (const operation of operations) {
      nextLibrary = this.applyOperation(nextLibrary, operation);
    }

    const parsedLibrary = ThemeLibrarySchema.safeParse({
      ...nextLibrary,
      revision: currentLibrary.revision + 1,
    });
    if (!parsedLibrary.success) {
      throw new BadRequestException({
        code: "INVALID_THEME_LIBRARY",
        issues: parsedLibrary.error.issues,
      });
    }

    const nextSelection = parsedLibrary.data.selection;
    if (nextSelection.kind === "custom") {
      const selectedThemeExists = parsedLibrary.data.customThemes.some(
        (theme) => theme.id === nextSelection.themeId,
      );
      if (!selectedThemeExists) {
        throw new BadRequestException({ code: "UNKNOWN_CUSTOM_THEME" });
      }
    }

    return parsedLibrary.data;
  }

  private applyOperation(
    library: ThemeLibrary,
    operation: ThemePatchOperation,
  ): ThemeLibrary {
    if (operation.kind === "select") {
      const nextSelection = operation.selection;
      if (nextSelection.kind === "custom") {
        const selectedThemeExists = library.customThemes.some(
          (theme) => theme.id === nextSelection.themeId,
        );
        if (!selectedThemeExists) {
          throw new BadRequestException({ code: "UNKNOWN_CUSTOM_THEME" });
        }
      }
      return { ...library, selection: nextSelection };
    }

    if (operation.kind === "upsert") {
      const existingIndex = library.customThemes.findIndex(
        (theme) => theme.id === operation.theme.id,
      );
      const customThemes = [...library.customThemes];
      if (existingIndex === -1) {
        customThemes.push(operation.theme);
      } else {
        customThemes[existingIndex] = operation.theme;
      }

      return {
        ...library,
        customThemes,
        selection: operation.activate
          ? { kind: "custom", themeId: operation.theme.id }
          : library.selection,
      };
    }

    if (operation.kind === "delete") {
      const customThemes = library.customThemes.filter(
        (theme) => theme.id !== operation.themeId,
      );
      const deletedActiveTheme =
        library.selection.kind === "custom" &&
        library.selection.themeId === operation.themeId;

      return {
        ...library,
        customThemes,
        selection: deletedActiveTheme
          ? { kind: "preset", presetId: "default" }
          : library.selection,
      };
    }

    return {
      ...library,
      specialOverrides: {
        ...library.specialOverrides,
        [operation.presetId]: operation.overrides,
      },
    };
  }

  private readLibrary(
    overrides: unknown,
    schemaVersion?: number,
  ): ThemeLibrary {
    const appearance = this.readAppearanceOverrides(overrides, schemaVersion);
    const library = normalizeThemeLibrary(appearance.theme);
    if (library) {
      return library;
    }

    return createDefaultThemeLibrary();
  }

  private readAppearanceOverrides(
    overrides: unknown,
    schemaVersion?: number,
  ): JsonRecord {
    if (!isRecord(overrides)) {
      return {};
    }

    if (
      schemaVersion !== undefined &&
      schemaVersion < SETTINGS_CATALOG.appearance.schemaVersion
    ) {
      return migrateSettingsDocument("appearance", overrides, schemaVersion);
    }

    return overrides;
  }

  private getDocumentWhere(userId: string) {
    return {
      userId_domain_scopeType_scopeId: {
        userId,
        domain: "appearance",
        scopeType: "USER" as SettingsScopeType,
        scopeId: userId,
      },
    };
  }
}
