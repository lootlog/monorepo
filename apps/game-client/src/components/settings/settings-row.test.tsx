import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "./settings-row";

describe("SettingsRow", () => {
  it("toggles the switch when the label is clicked", async () => {
    const user = userEvent.setup();

    const onCheckedChange =
      vi.fn<NonNullable<ComponentProps<typeof Switch>["onCheckedChange"]>>();

    render(
      <SettingsRow htmlFor="row-switch" label="Pozwól wybierać świat">
        <Switch id="row-switch" checked onCheckedChange={onCheckedChange} />
      </SettingsRow>,
    );

    await user.click(screen.getByText("Pozwól wybierać świat"));

    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.any(Object));
  });
});
