import { render } from "@testing-library/react";
import { GeneralSettingsTab } from "./general-settings-tab";

const testState = vi.hoisted(() => ({
  gameInterface: "si" as "ni" | "si",
}));

vi.mock("@/lib/game", () => ({
  Game: {
    get interface() {
      return testState.gameInterface;
    },
  },
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: () => ({
    allowWorldSelection: false,
    animationEffectsEnabled: true,
    toggleAllowWorldSelection: vi.fn(),
    toggleAnimationEffects: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-current-game-account-preferences", () => ({
  useCurrentGameAccountPreferences: () => ({
    accountId: "account-1",
    data: { pings: { enabled: true } },
  }),
}));

vi.mock("@/hooks/api/use-user-account-preferences", () => ({
  useUpdateUserGameAccountPreferences: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

describe("GeneralSettingsTab", () => {
  beforeEach(() => {
    testState.gameInterface = "si";
  });

  it("hides map ping settings on the old interface", () => {
    const { container } = render(<GeneralSettingsTab />);

    expect(container.querySelector("#map-pings")).not.toBeInTheDocument();
  });

  it("shows map ping settings on the new interface", () => {
    testState.gameInterface = "ni";
    const { container } = render(<GeneralSettingsTab />);

    expect(container.querySelector("#map-pings")).toBeInTheDocument();
  });
});
