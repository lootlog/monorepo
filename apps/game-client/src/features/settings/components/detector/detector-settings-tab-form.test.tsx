import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/hooks/api/use-npcs";
import { DetectorSettingsTabForm } from "./detector-settings-tab-form";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";

const mockMutate = vi.fn();

vi.mock("@/hooks/api/use-user-account-preferences", () => ({
  useUpdateUserGameAccountPreferences: vi.fn(),
}));

vi.mock("@/hooks/use-current-game-account-detector-settings", () => ({
  useCurrentGameAccountDetectorSettings: vi.fn(),
}));

vi.mock("@/hooks/use-debounced-callback", () => ({
  useDebouncedCallback: vi.fn((callback: (...args: unknown[]) => void) => {
    return callback;
  }),
}));

const createDetectorTypeSettings = (overrides?: {
  detect?: boolean;
  autoSend?: boolean;
  notifyWindow?: boolean;
  highlight?: boolean;
  notifySound?: boolean;
}) => ({
  detect: overrides?.detect ?? false,
  autoSend: overrides?.autoSend ?? false,
  notifyWindow: overrides?.notifyWindow ?? false,
  highlight: overrides?.highlight ?? false,
  notifySound: overrides?.notifySound ?? false,
});

describe("DetectorSettingsTabForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUpdateUserGameAccountPreferences).mockReturnValue({
      mutate: mockMutate,
    } as unknown as ReturnType<typeof useUpdateUserGameAccountPreferences>);
    vi.mocked(useCurrentGameAccountDetectorSettings).mockReturnValue({
      accountId: "account-1",
      isFetched: true,
      settings: {
        [NpcType.HERO]: createDetectorTypeSettings(),
      },
    } as ReturnType<typeof useCurrentGameAccountDetectorSettings>);
  });

  it("disables all secondary toggles when detection is turned off", () => {
    const { container } = render(
      <DetectorSettingsTabForm categoryKey={NpcType.HERO} />,
    );

    expect(
      container.querySelector(`#${NpcType.HERO}-detect`),
    ).not.toBeDisabled();
    expect(container.querySelector(`#${NpcType.HERO}-autoSend`)).toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-notifyWindow`),
    ).toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-highlight`),
    ).toBeDisabled();
    expect(
      container.querySelector(`#${NpcType.HERO}-notifySound`),
    ).toBeDisabled();
  });

  it("enables secondary toggles and persists the next detector settings after turning detection on", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DetectorSettingsTabForm categoryKey={NpcType.HERO} />,
    );

    const detectSwitch = container.querySelector(`#${NpcType.HERO}-detect`);
    const autoSendSwitch = container.querySelector(`#${NpcType.HERO}-autoSend`);

    if (!(detectSwitch instanceof HTMLButtonElement)) {
      throw new Error("Expected detect switch");
    }

    if (!(autoSendSwitch instanceof HTMLButtonElement)) {
      throw new Error("Expected auto-send switch");
    }

    await user.click(detectSwitch);

    expect(mockMutate).toHaveBeenCalledWith({
      detector: {
        [NpcType.HERO]: {
          detect: true,
          autoSend: false,
          notifyWindow: false,
          highlight: false,
          notifySound: false,
        },
      },
    });
    expect(autoSendSwitch).not.toBeDisabled();
  });
});
