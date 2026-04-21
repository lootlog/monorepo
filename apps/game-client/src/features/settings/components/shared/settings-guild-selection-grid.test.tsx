import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GuildResponseDtoOutput as Guild } from "@/lib/api/generated/main/model";
import { SettingsGuildSelectionGrid } from "./settings-guild-selection-grid";

const guilds: Guild[] = [
  { id: "guild-1", name: "Alpha", icon: null, ownerId: "owner-1" },
  { id: "guild-2", name: "Beta", icon: null, ownerId: "owner-2" },
];

describe("SettingsGuildSelectionGrid", () => {
  it("keeps multi-select behavior for existing callers", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <SettingsGuildSelectionGrid
        guilds={guilds}
        selectedGuildIds={["guild-1"]}
        onToggle={onToggle}
        emptyStateLabel="Brak gildii."
        variant="compact"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Przełącz gildię Beta: Wyłączone",
      }),
    );

    expect(onToggle).toHaveBeenCalledWith("guild-2");
  });

  it("switches selection in single-choice mode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SettingsGuildSelectionGrid
        guilds={guilds}
        selectedGuildId="guild-1"
        selectionMode="single"
        onSelect={onSelect}
        emptyStateLabel="Brak gildii."
        variant="compact"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Wybierz gildię Beta: Wyłączone",
      }),
    );

    expect(onSelect).toHaveBeenCalledWith("guild-2");
  });

  it("does not clear the current guild in single-choice mode", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SettingsGuildSelectionGrid
        guilds={guilds}
        selectedGuildId="guild-1"
        selectionMode="single"
        onSelect={onSelect}
        emptyStateLabel="Brak gildii."
        variant="compact"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Wybierz gildię Alpha: Włączone",
      }),
    );

    expect(onSelect).not.toHaveBeenCalled();
  });
});
