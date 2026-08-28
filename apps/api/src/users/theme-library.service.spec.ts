import { createDefaultThemeLibrary } from "@lootlog/types";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TEST_THEME_CONFIG } from "./theme-test-fixture";
import { ThemeLibraryService } from "./theme-library.service";

const createService = (document: unknown = null) => {
  const transaction = {
    $queryRaw: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    userSettingDocument: {
      findUnique: vi.fn<() => Promise<unknown>>().mockResolvedValue(document),
      upsert: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    },
  };
  const prisma = {
    userSettingDocument: {
      findUnique: vi.fn<() => Promise<unknown>>().mockResolvedValue(document),
    },
    $transaction: vi.fn<
      (
        callback: (client: typeof transaction) => Promise<unknown>,
      ) => Promise<unknown>
    >((callback: (client: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  };

  return {
    service: new ThemeLibraryService(prisma as never),
    prisma,
    transaction,
  };
};

describe("ThemeLibraryService", () => {
  it("normalizes the current internal v1 draft without dropping the library", async () => {
    const {
      primaryHover: _primaryHover,
      primaryActive: _primaryActive,
      secondaryHover: _secondaryHover,
      secondaryActive: _secondaryActive,
      neutralHover: _neutralHover,
      neutralActive: _neutralActive,
      destructiveHover: _destructiveHover,
      destructiveActive: _destructiveActive,
      surfaceHover: _surfaceHover,
      surfaceSelected: _surfaceSelected,
      inputHover: _inputHover,
      inputFocus: _inputFocus,
      sidebarHover: _sidebarHover,
      sidebarActive: _sidebarActive,
      shadow: _shadow,
      ...draftTokens
    } = TEST_THEME_CONFIG.tokens;
    const {
      headingWeight: _headingWeight,
      bodyWeight: _bodyWeight,
      tracking: _tracking,
      ...draftTypography
    } = TEST_THEME_CONFIG.typography;
    const {
      components: _components,
      border: _border,
      chartStyle: _chartStyle,
      ...draftConfig
    } = TEST_THEME_CONFIG;
    const { service } = createService({
      schemaVersion: 4,
      overrides: {
        theme: {
          ...createDefaultThemeLibrary(),
          customThemes: [
            {
              id: "draft-theme",
              name: "Draft",
              config: {
                ...draftConfig,
                tokens: draftTokens,
                typography: draftTypography,
              },
            },
          ],
        },
      },
    });

    await expect(service.getThemeLibrary("user-1")).resolves.toMatchObject({
      customThemes: [
        {
          id: "draft-theme",
          config: {
            components: {
              button: "solid",
              card: "outline",
              input: "outline",
              badge: "solid",
              table: "separated",
            },
            border: "subtle",
            chartStyle: { grid: "subtle", stroke: "default", fill: "soft" },
          },
        },
      ],
    });
  });

  it("returns an isolated default library when no document exists", async () => {
    const { service, prisma } = createService();

    await expect(service.getThemeLibrary("user-1")).resolves.toEqual(
      createDefaultThemeLibrary(),
    );
    expect(prisma.userSettingDocument.findUnique).toHaveBeenCalledWith({
      where: {
        userId_domain_scopeType_scopeId: {
          userId: "user-1",
          domain: "appearance",
          scopeType: "USER",
          scopeId: "user-1",
        },
      },
    });
  });

  it("updates the library atomically without replacing appearance siblings", async () => {
    const currentLibrary = createDefaultThemeLibrary();
    const { service, transaction } = createService({
      schemaVersion: 4,
      overrides: {
        theme: currentLibrary,
        chat: { showTimestamp: false },
      },
    });

    const result = await service.patchThemeLibrary("user-1", {
      revision: 1,
      operations: [
        {
          kind: "upsert",
          activate: true,
          theme: {
            id: "night-signal",
            name: "Nocny sygnał",
            config: TEST_THEME_CONFIG,
          },
        },
      ],
    });

    expect(result.revision).toBe(2);
    expect(result.selection).toEqual({
      kind: "custom",
      themeId: "night-signal",
    });
    expect(transaction.userSettingDocument.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          overrides: expect.objectContaining({
            chat: { showTimestamp: false },
            theme: result,
          }),
        }),
      }),
    );
  });

  it("returns a conflict with the current revision for stale patches", async () => {
    const { service } = createService({
      schemaVersion: 4,
      overrides: {
        theme: { ...createDefaultThemeLibrary(), revision: 4 },
      },
    });

    await expect(
      service.patchThemeLibrary("user-1", {
        revision: 3,
        operations: [
          {
            kind: "select",
            selection: { kind: "preset", presetId: "fantasy" },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("falls back to the default preset after deleting the active custom theme", async () => {
    const library = {
      ...createDefaultThemeLibrary(),
      selection: { kind: "custom", themeId: "night-signal" } as const,
      customThemes: [
        {
          id: "night-signal",
          name: "Nocny sygnał",
          config: TEST_THEME_CONFIG,
        },
      ],
    };
    const { service } = createService({
      schemaVersion: 4,
      overrides: { theme: library },
    });

    await expect(
      service.patchThemeLibrary("user-1", {
        revision: 1,
        operations: [{ kind: "delete", themeId: "night-signal" }],
      }),
    ).resolves.toMatchObject({
      revision: 2,
      selection: { kind: "preset", presetId: "default" },
      customThemes: [],
    });
  });

  it("rejects selecting an unknown custom theme", async () => {
    const { service } = createService();

    await expect(
      service.patchThemeLibrary("user-1", {
        revision: 1,
        operations: [
          {
            kind: "select",
            selection: { kind: "custom", themeId: "missing" },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enforces the custom theme library limit", async () => {
    const customThemes = Array.from({ length: 20 }, (_, index) => ({
      id: `theme-${index}`,
      name: `Theme ${index}`,
      config: TEST_THEME_CONFIG,
    }));
    const { service } = createService({
      schemaVersion: 4,
      overrides: {
        theme: { ...createDefaultThemeLibrary(), customThemes },
      },
    });

    await expect(
      service.patchThemeLibrary("user-1", {
        revision: 1,
        operations: [
          {
            kind: "upsert",
            activate: false,
            theme: {
              id: "theme-21",
              name: "Theme 21",
              config: TEST_THEME_CONFIG,
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("stores only density and motion overrides for special themes", async () => {
    const { service } = createService();

    await expect(
      service.patchThemeLibrary("user-1", {
        revision: 1,
        operations: [
          {
            kind: "set-special-overrides",
            presetId: "rias",
            overrides: { density: "compact", motion: "quiet" },
          },
        ],
      }),
    ).resolves.toMatchObject({
      specialOverrides: {
        rias: { density: "compact", motion: "quiet" },
      },
    });
  });
});
