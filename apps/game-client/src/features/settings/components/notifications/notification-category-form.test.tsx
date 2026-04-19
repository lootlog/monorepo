import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/hooks/api/use-npcs";
import { NotificationCategoryForm } from "./notification-category-form";
import { useGuilds, type Guild } from "@/hooks/api/use-guilds";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountNotificationSettings } from "@/hooks/use-current-game-account-notification-settings";

const mockMutate = vi.fn();

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: vi.fn(),
}));

vi.mock("@/hooks/api/use-user-account-preferences", () => ({
  useUpdateUserGameAccountPreferences: vi.fn(),
}));

vi.mock("@/hooks/use-current-game-account-notification-settings", () => ({
  useCurrentGameAccountNotificationSettings: vi.fn(),
}));

vi.mock("@/hooks/use-debounced-callback", () => ({
  useDebouncedCallback: vi.fn((callback: (...args: unknown[]) => void) => {
    return callback;
  }),
}));

const guilds: Guild[] = [
  { id: "guild-1", name: "Alpha", icon: null },
  { id: "guild-2", name: "Beta", icon: null },
  { id: "guild-3", name: "Gamma", icon: null },
];

const createNotificationSettings = (overrides?: {
  show?: boolean;
  highlight?: boolean;
  ignoreOtherWorlds?: boolean;
  autoHideTimeout?: number;
  guildIds?: string[];
  sound?: boolean;
}) => ({
  show: overrides?.show ?? false,
  highlight: overrides?.highlight ?? false,
  ignoreOtherWorlds: overrides?.ignoreOtherWorlds ?? false,
  autoHideTimeout: overrides?.autoHideTimeout ?? 0,
  guildIds: overrides?.guildIds ?? ["guild-1"],
  sound: overrides?.sound ?? false,
});

describe("NotificationCategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGuilds).mockReturnValue({
      data: guilds,
    } as ReturnType<typeof useGuilds>);
    vi.mocked(useUpdateUserGameAccountPreferences).mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useUpdateUserGameAccountPreferences>);
    vi.mocked(useCurrentGameAccountNotificationSettings).mockReturnValue({
      accountId: "account-1",
      isFetched: true,
      settings: {
        [NpcType.HERO]: createNotificationSettings(),
      },
    } as ReturnType<typeof useCurrentGameAccountNotificationSettings>);
  });

  it("disables dependent controls and guild selection when showing notifications is turned off", () => {
    const { container } = render(
      <NotificationCategoryForm categoryKey={NpcType.HERO} />,
    );

    expect(container.querySelector(`#${NpcType.HERO}-show`)).not.toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-ignoreOtherWorlds`),
    ).toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-highlight`),
    ).toBeDisabled();
    expect(container.querySelector(`#${NpcType.HERO}-sound`)).toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-auto-hide-timeout`),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Przełącz gildię Alpha: Włączone",
      }),
    ).toBeDisabled();
  });

  it("enables dependent controls and persists updated settings after turning notifications on", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NotificationCategoryForm categoryKey={NpcType.HERO} />,
    );

    const showSwitch = container.querySelector(`#${NpcType.HERO}-show`);
    const highlightSwitch = container.querySelector(
      `#${NpcType.HERO}-highlight`,
    );

    if (!(showSwitch instanceof HTMLButtonElement)) {
      throw new Error("Expected show switch");
    }

    if (!(highlightSwitch instanceof HTMLButtonElement)) {
      throw new Error("Expected highlight switch");
    }

    await user.click(showSwitch);

    expect(mockMutate).toHaveBeenCalledWith({
      notifications: {
        [NpcType.HERO]: {
          show: true,
          highlight: false,
          ignoreOtherWorlds: false,
          autoHideTimeout: 0,
          guildIds: ["guild-1"],
          sound: false,
        },
      },
    });
    expect(highlightSwitch).not.toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Przełącz gildię Alpha: Włączone",
      }),
    ).not.toBeDisabled();
  });

  it("updates selected guilds through the compact guild grid", async () => {
    const user = userEvent.setup();

    vi.mocked(useCurrentGameAccountNotificationSettings).mockReturnValue({
      accountId: "account-1",
      isFetched: true,
      settings: {
        [NpcType.HERO]: createNotificationSettings({
          show: true,
          guildIds: ["guild-1", "guild-2"],
        }),
      },
    } as ReturnType<typeof useCurrentGameAccountNotificationSettings>);

    render(<NotificationCategoryForm categoryKey={NpcType.HERO} />);

    await user.click(
      screen.getByRole("button", {
        name: "Przełącz gildię Beta: Włączone",
      }),
    );

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        notifications: {
          [NpcType.HERO]: {
            show: true,
            highlight: false,
            ignoreOtherWorlds: false,
            autoHideTimeout: 0,
            guildIds: ["guild-1"],
            sound: false,
          },
        },
      });
    });
  });

  it("defers syncing auto-hide timeout until blur and normalizes empty values to zero", async () => {
    const user = userEvent.setup();

    vi.mocked(useCurrentGameAccountNotificationSettings).mockReturnValue({
      accountId: "account-1",
      isFetched: true,
      settings: {
        [NpcType.HERO]: createNotificationSettings({
          show: true,
          autoHideTimeout: 12,
        }),
      },
    } as ReturnType<typeof useCurrentGameAccountNotificationSettings>);

    const { container } = render(
      <NotificationCategoryForm categoryKey={NpcType.HERO} />,
    );

    const autoHideInput = container.querySelector(
      `#${NpcType.HERO}-auto-hide-timeout`,
    );

    if (!(autoHideInput instanceof HTMLInputElement)) {
      throw new Error("Expected auto-hide input");
    }

    await user.clear(autoHideInput);
    await user.type(autoHideInput, "25");

    expect(mockMutate).not.toHaveBeenCalled();

    await user.tab();

    expect(mockMutate).toHaveBeenCalledWith({
      notifications: {
        [NpcType.HERO]: {
          show: true,
          highlight: false,
          ignoreOtherWorlds: false,
          autoHideTimeout: 25,
          guildIds: ["guild-1"],
          sound: false,
        },
      },
    });

    await user.clear(autoHideInput);
    await user.tab();

    expect(mockMutate).toHaveBeenLastCalledWith({
      notifications: {
        [NpcType.HERO]: {
          show: true,
          highlight: false,
          ignoreOtherWorlds: false,
          autoHideTimeout: 0,
          guildIds: ["guild-1"],
          sound: false,
        },
      },
    });
  });
});
