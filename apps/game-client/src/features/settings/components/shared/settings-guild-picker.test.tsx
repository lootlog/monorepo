import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GuildIdentity as Guild } from "@/lib/api/generated-helpers";
import { SettingsGuildPicker } from "./settings-guild-picker";

const guilds: Guild[] = [
  {
    id: "guild-1",
    name: "Alpha",
    icon: null,
  },
  {
    id: "guild-2",
    name: "Beta",
    icon: null,
  },
];

describe("SettingsGuildPicker", () => {
  it("reports the one guild the user toggled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn<(guildId: string) => void>();

    render(
      <SettingsGuildPicker
        guilds={guilds}
        selectedGuildIds={["guild-1"]}
        onToggle={onToggle}
        emptyStateLabel="Brak gildii."
      />,
    );

    await user.click(screen.getByRole("button", { name: "Beta" }));
    await user.click(screen.getByRole("button", { name: "Alpha" }));

    expect(onToggle.mock.calls).toEqual([["guild-2"], ["guild-1"]]);
  });
});
