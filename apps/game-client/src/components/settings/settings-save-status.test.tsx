import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { SettingsSaveStatus } from "./settings-save-status";

describe("SettingsSaveStatus", () => {
  afterEach(() => {
    useSettingsSaveStatusStore.getState().setStatus("idle");
    vi.restoreAllMocks();
  });

  it("offers a retry after a failed save that resends the retained patch", async () => {
    const retry = vi
      .spyOn(settingsPatchQueue, "retry")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<SettingsSaveStatus />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    useSettingsSaveStatusStore.getState().setStatus("saving");
    expect(await screen.findByText("Zapisywanie…")).toBeInTheDocument();

    useSettingsSaveStatusStore.getState().setStatus("error");
    await user.click(await screen.findByRole("button", { name: "Ponów" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows the saved confirmation only for a moment", async () => {
    render(<SettingsSaveStatus />);

    useSettingsSaveStatusStore.getState().setStatus("saved");
    expect(await screen.findByText("Zapisano")).toBeInTheDocument();

    await waitFor(
      () => expect(screen.queryByText("Zapisano")).not.toBeInTheDocument(),
      { timeout: 2500 },
    );
  });
});
