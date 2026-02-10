import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AddonLanguage, Prisma } from 'generated/client';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { PrismaService } from 'src/db/prisma.service';
import type { CreateUserAddonDto } from 'src/user-addons/dto/create-user-addon.dto';
import type { UpdateUserAddonDto } from 'src/user-addons/dto/update-user-addon.dto';
import { extractAddonMetadataFromSource } from 'src/user-addons/utils/extract-addon-metadata-from-source';
import { generateSlug } from 'src/shared/utils/generate-slug';

const MAX_SOURCE_CODE_LENGTH = 120_000;
const TYPE_BUNDLE_CACHE_TTL_MS = 60_000;

type AddonTypeBundle = {
  files: { path: string; content: string }[];
  sdkDeclaration: string;
  compilerHints: {
    baseUrl: string;
    paths: Record<string, string[]>;
  };
};

type NormalizedAddonMetadata = {
  runtimeId: string;
  name: string;
  description: string | null;
  version: string;
};

const ADDON_SDK_DECLARATION = `
declare module "@lootlog/addon-sdk" {
  export type AddonSetupContext = {
    Game: typeof import("@/lib/game").Game;
    Engine: Window["Engine"];
    window: Window;
    gameEventsManager: typeof import("@/lib/game-events-manager").gameEventsManager;
    log: (...messages: unknown[]) => void;
  };

  export type RemoteGameClientAddon = {
    id: string;
    name: string;
    description?: string;
    version?: string;
    order?: number;
    defaultEnabled?: boolean;
    setup?: (context: AddonSetupContext) => void | (() => void);
  };

  export function defineAddon<TAddon extends RemoteGameClientAddon>(addon: TAddon): TAddon;
}
`.trim();

@Injectable()
export class UserAddonsService {
  private typeBundleCache: {
    expiresAt: number;
    value: AddonTypeBundle;
  } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async listUserAddons(userId: string) {
    return this.prisma.userAddon.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getRuntimeAddons(userId: string) {
    return this.prisma.userAddon.findMany({
      where: { userId, installed: true },
      orderBy: [{ updatedAt: 'desc' }, { runtimeId: 'asc' }],
    });
  }

  async createUserAddon(userId: string, dto: CreateUserAddonDto) {
    const language = dto.language ?? AddonLanguage.TYPESCRIPT;
    const sourceCode = this.normalizeSourceCode(dto.sourceCode);
    const metadata = this.normalizeAddonMetadata(sourceCode);
    const compiledCode = this.transpileAddonSource(language, sourceCode);

    try {
      return await this.prisma.userAddon.create({
        data: {
          userId,
          runtimeId: metadata.runtimeId,
          name: metadata.name,
          description: metadata.description,
          version: metadata.version,
          language,
          sourceCode,
          compiledCode,
          installed: dto.installed ?? false,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          `Addon with runtimeId "${metadata.runtimeId}" already exists for this user`,
        );
      }

      throw error;
    }
  }

  async updateUserAddon(
    userId: string,
    addonId: string,
    dto: UpdateUserAddonDto,
  ) {
    const existing = await this.getOwnedAddonOrThrow(userId, addonId);

    const language = dto.language ?? existing.language;
    const sourceCode =
      dto.sourceCode !== undefined
        ? this.normalizeSourceCode(dto.sourceCode)
        : existing.sourceCode;
    const metadata: NormalizedAddonMetadata =
      dto.sourceCode !== undefined
        ? this.normalizeAddonMetadata(sourceCode)
        : {
            runtimeId: existing.runtimeId,
            name: existing.name,
            description: existing.description,
            version: existing.version,
          };

    const shouldRecompile =
      dto.sourceCode !== undefined || dto.language !== undefined;
    const compiledCode = shouldRecompile
      ? this.transpileAddonSource(language, sourceCode)
      : existing.compiledCode;

    try {
      return await this.prisma.userAddon.update({
        where: { id: existing.id },
        data: {
          runtimeId: metadata.runtimeId,
          name: metadata.name,
          description: metadata.description,
          version: metadata.version,
          language,
          sourceCode,
          compiledCode,
          installed: dto.installed ?? existing.installed,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          `Addon with runtimeId "${metadata.runtimeId}" already exists for this user`,
        );
      }

      throw error;
    }
  }

  async deleteUserAddon(userId: string, addonId: string) {
    const existing = await this.getOwnedAddonOrThrow(userId, addonId);

    await this.prisma.userAddon.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  async installAddon(userId: string, addonId: string) {
    return this.setAddonInstalled(userId, addonId, true);
  }

  async uninstallAddon(userId: string, addonId: string) {
    return this.setAddonInstalled(userId, addonId, false);
  }

  async getTypeBundle(): Promise<AddonTypeBundle> {
    const now = Date.now();
    if (this.typeBundleCache && this.typeBundleCache.expiresAt > now) {
      return this.typeBundleCache.value;
    }

    let files: { path: string; content: string }[] = [];
    try {
      const gameClientSrcPath = this.resolveGameClientSrcPath();
      const allTypeFiles = await this.collectTypeFiles(
        path.join(gameClientSrcPath, 'types'),
        gameClientSrcPath,
      );
      const gameLibPath = path.join(gameClientSrcPath, 'lib', 'game.ts');
      const gameLibContent = await readFile(gameLibPath, 'utf-8');
      const gameEventsManagerPath = path.join(
        gameClientSrcPath,
        'lib',
        'game-events-manager.ts',
      );
      const gameEventsManagerContent = await readFile(
        gameEventsManagerPath,
        'utf-8',
      );

      files = [
        ...allTypeFiles,
        {
          path: 'file:///src/lib/game.ts',
          content: gameLibContent,
        },
        {
          path: 'file:///src/lib/game-events-manager.ts',
          content: gameEventsManagerContent,
        },
      ].sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      console.warn(
        '[user-addons] Failed to build full type bundle, returning SDK declaration only.',
        error,
      );
    }

    const bundle: AddonTypeBundle = {
      files,
      sdkDeclaration: ADDON_SDK_DECLARATION,
      compilerHints: {
        baseUrl: 'file:///src',
        paths: {
          '@/*': ['*'],
        },
      },
    };

    this.typeBundleCache = {
      expiresAt: now + TYPE_BUNDLE_CACHE_TTL_MS,
      value: bundle,
    };

    return bundle;
  }

  private async setAddonInstalled(
    userId: string,
    addonId: string,
    installed: boolean,
  ) {
    const existing = await this.getOwnedAddonOrThrow(userId, addonId);

    return this.prisma.userAddon.update({
      where: { id: existing.id },
      data: { installed },
    });
  }

  private normalizeRuntimeId(runtimeId?: string) {
    const generated = generateSlug(runtimeId);

    if (!generated || generated.length < 3 || generated.length > 64) {
      throw new BadRequestException(
        'runtimeId is required and must be 3-64 chars after slug normalization',
      );
    }

    return generated;
  }

  private normalizeAddonMetadata(sourceCode: string): NormalizedAddonMetadata {
    const extracted = extractAddonMetadataFromSource(sourceCode);

    const name = extracted.name.trim();
    if (name.length < 3 || name.length > 80) {
      throw new BadRequestException(
        'Addon metadata "name" must be between 3 and 80 characters',
      );
    }

    const version = extracted.version?.trim() || '0.1.0';
    if (version.length < 1 || version.length > 32) {
      throw new BadRequestException(
        'Addon metadata "version" must be between 1 and 32 characters',
      );
    }

    const description = extracted.description?.trim();
    if (description && description.length > 500) {
      throw new BadRequestException(
        'Addon metadata "description" cannot exceed 500 characters',
      );
    }

    return {
      runtimeId: this.normalizeRuntimeId(extracted.id),
      name,
      description: description || null,
      version,
    };
  }

  private normalizeSourceCode(sourceCode: string) {
    const normalized = sourceCode?.trim();
    if (!normalized) {
      throw new BadRequestException('sourceCode cannot be empty');
    }

    if (normalized.length > MAX_SOURCE_CODE_LENGTH) {
      throw new BadRequestException(
        `sourceCode cannot exceed ${MAX_SOURCE_CODE_LENGTH} characters`,
      );
    }

    return normalized;
  }

  private transpileAddonSource(language: AddonLanguage, sourceCode: string) {
    try {
      const result = ts.transpileModule(sourceCode, {
        fileName:
          language === AddonLanguage.JAVASCRIPT ? 'addon.jsx' : 'addon.tsx',
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          moduleResolution: ts.ModuleResolutionKind.NodeJs,
          jsx: ts.JsxEmit.ReactJSX,
          strict: false,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        },
      });

      const diagnostics =
        result.diagnostics?.filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
        ) ?? [];

      if (diagnostics.length > 0) {
        const message = diagnostics
          .slice(0, 5)
          .map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          )
          .join(' | ');

        throw new BadRequestException(
          `Addon source contains TypeScript errors: ${message}`,
        );
      }

      if (!result.outputText.trim()) {
        throw new BadRequestException('Compiled addon code is empty');
      }

      return result.outputText;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to transpile addon source',
      );
    }
  }

  private async getOwnedAddonOrThrow(userId: string, addonId: string) {
    const addon = await this.prisma.userAddon.findFirst({
      where: { id: addonId, userId },
    });

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    return addon;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private resolveGameClientSrcPath() {
    const candidates = [
      path.resolve(process.cwd(), 'apps', 'game-client', 'src'),
      path.resolve(process.cwd(), '..', 'game-client', 'src'),
      path.resolve(__dirname, '..', '..', '..', 'game-client', 'src'),
      path.resolve(__dirname, '..', '..', '..', '..', 'game-client', 'src'),
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'game-client',
        'src',
      ),
    ];

    for (const candidate of candidates) {
      if (
        existsSync(path.join(candidate, 'lib', 'game.ts')) &&
        existsSync(path.join(candidate, 'types'))
      ) {
        return candidate;
      }
    }

    throw new InternalServerErrorException(
      'Cannot resolve game-client sources required for addon type bundle',
    );
  }

  private async collectTypeFiles(typesDir: string, srcRoot: string) {
    const files: { path: string; content: string }[] = [];

    const walk = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });

      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(directory, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath);
            return;
          }

          if (!entry.isFile()) {
            return;
          }

          if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            return;
          }

          const relative = path
            .relative(srcRoot, fullPath)
            .split(path.sep)
            .join('/');
          const content = await readFile(fullPath, 'utf-8');

          files.push({
            path: `file:///src/${relative}`,
            content,
          });
        }),
      );
    };

    await walk(typesDir);

    return files;
  }
}
