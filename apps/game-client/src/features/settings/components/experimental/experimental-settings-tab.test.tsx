import { render as renderUi, screen } from "@testing-library/react";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { ExperimentalSettingsTab } from "./experimental-settings-tab";

import { createGuildPreferencesTest } from "@/test/guild-preferences-test";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<ExperimentalSettingsTab />, { wrapper: harness.wrapper });

describe("ExperimentalSettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ interface: "si" });
  });

  it("explains that the features need the new interface on the old one", () => {
    const { container } = render();

    expect(container.querySelector("#map-pings")).not.toBeInTheDocument();
    expect(container.querySelector("#air-tags")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Funkcje eksperymentalne są dostępne tylko w nowym interfejsie gry.",
      ),
    ).toBeInTheDocument();
  });

  it("shows map ping settings on the new interface", () => {
    setTestRuntimeGame({ interface: "ni" });
    const { container } = render();

    expect(container.querySelector("#map-pings")).toBeInTheDocument();
    expect(container.querySelector("#air-tags")).toBeInTheDocument();
  });
});
