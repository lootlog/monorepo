import { render } from "@testing-library/react";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { GeneralSettingsTab } from "./general-settings-tab";

const testState = vi.hoisted(() => ({
  gameInterface: "si" as "ni" | "si",
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
    data: { airTags: { enabled: false }, pings: { enabled: true } },
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
    setTestRuntimeGame({ interface: "si" });
  });

  it("hides map ping settings on the old interface", () => {
    const { container } = render(<GeneralSettingsTab />);

    expect(container.querySelector("#map-pings")).not.toBeInTheDocument();
    expect(container.querySelector("#air-tags")).not.toBeInTheDocument();
  });

  it("shows map ping settings on the new interface", () => {
    testState.gameInterface = "ni";
    setTestRuntimeGame({ interface: "ni" });
    const { container } = render(<GeneralSettingsTab />);

    expect(container.querySelector("#map-pings")).toBeInTheDocument();
    expect(container.querySelector("#air-tags")).toBeInTheDocument();
  });
});
