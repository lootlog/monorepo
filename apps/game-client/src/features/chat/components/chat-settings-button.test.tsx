import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { ChatSettingsButton } from "./chat-settings-button";

describe("ChatSettingsButton", () => {
  beforeEach(() => {
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
  });

  it("opens the settings window on the chat appearance path", async () => {
    const user = userEvent.setup();
    render(<ChatSettingsButton />);

    await user.click(screen.getByRole("button", { name: "Ustawienia chatu" }));

    expect(useWindowsStore.getState().settings).toMatchObject({
      open: true,
      state: { activeTab: "chat", activeSubsection: "chat-appearance" },
    });
  });
});
