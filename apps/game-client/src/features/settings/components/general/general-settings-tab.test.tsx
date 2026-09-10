import { render as renderUi } from "@testing-library/react";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { GeneralSettingsTab } from "./general-settings-tab";

import { createGuildPreferencesTest } from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<GeneralSettingsTab />, { wrapper: harness.wrapper });

describe("GeneralSettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ interface: "si" });
  });

  it("hides map ping settings on the old interface", () => {
    const { container } = render();

    expect(container.querySelector("#map-pings")).not.toBeInTheDocument();
    expect(container.querySelector("#air-tags")).not.toBeInTheDocument();
  });

  it("shows map ping settings on the new interface", () => {
    setTestRuntimeGame({ interface: "ni" });
    const { container } = render();

    expect(container.querySelector("#map-pings")).toBeInTheDocument();
    expect(container.querySelector("#air-tags")).toBeInTheDocument();
  });
});
