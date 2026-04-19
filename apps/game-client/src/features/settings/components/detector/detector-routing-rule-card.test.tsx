import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DetectorRoutingSettingsTranslations } from "./detector-routing-settings-translations";
import { DetectorRoutingRuleCard } from "./detector-routing-rule-card";
import type { Guild } from "@/hooks/api/use-guilds";

vi.mock(
  "@/features/settings/components/detector/detector-routing-guild-preview-tile",
  () => ({
    DetectorRoutingGuildPreviewTile: ({ guild }: { guild: Guild }) => (
      <div data-testid="preview-guild">{guild.name}</div>
    ),
  }),
);

vi.mock(
  "@/features/settings/components/shared/settings-guild-selection-grid",
  () => ({
    SettingsGuildSelectionGrid: ({
      onToggle,
      selectedGuildIds,
      emptyStateLabel,
      guilds,
    }: {
      onToggle: (guildId: string) => void;
      selectedGuildIds: string[];
      emptyStateLabel: string;
      guilds?: Guild[];
    }) => (
      <div>
        <div>{emptyStateLabel}</div>
        <div>{selectedGuildIds.join(",")}</div>
        {guilds?.map((guild) => (
          <button
            key={guild.id}
            type="button"
            onClick={() => onToggle(guild.id)}
          >
            {guild.name}
          </button>
        ))}
      </div>
    ),
  }),
);

const translations: DetectorRoutingSettingsTranslations = {
  sectionTitle: "Routing na serwery",
  sectionDescription: "Opis",
  addRuleButton: "Dodaj regułę",
  emptyState: "Brak reguł",
  ruleLabel: (index) => `Reguła ${index}`,
  selectedGuildsBadge: (count) => `Serwery ${count}`,
  minLevelBadge: (level) => `Od ${level}`,
  maxLevelBadge: (level) => `Do ${level}`,
  minLevelLabel: "Od levela",
  maxLevelLabel: "Do levela",
  guildSelectionLabel: "Na jakie serwery wysyłać",
  noGuildsSelected: "Brak serwerów",
  noGuildsAvailable: "Brak serwerów do wyboru.",
  deleteRuleLabel: (index) => `Usuń regułę ${index}`,
  toggleRuleLabel: (index) => `Przełącz regułę ${index}`,
  guildOverflowLabel: (count) => `+${count}`,
  guildOverflowTooltip: (count) => `${count} kolejnych serwerów`,
};

const guilds: Guild[] = [
  { id: "guild-1", name: "Alpha", icon: null },
  { id: "guild-2", name: "Beta", icon: null },
  { id: "guild-3", name: "Gamma", icon: null },
  { id: "guild-4", name: "Delta", icon: null },
  { id: "guild-5", name: "Epsilon", icon: null },
];

describe("DetectorRoutingRuleCard", () => {
  it("shows empty selected-guild state and toggles open from the header", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DetectorRoutingRuleCard
        fieldIdInput=<input type="hidden" value="rule-1" />
        guilds={guilds}
        index={0}
        isOpen={false}
        minLevel={20}
        maxLevel={80}
        onOpenChange={onOpenChange}
        onRemove={vi.fn()}
        onToggleGuild={vi.fn()}
        selectedGuildIds={[]}
        translations={translations}
        minLevelField={<div>min field</div>}
        maxLevelField={<div>max field</div>}
      />,
    );

    expect(screen.getByText("Brak serwerów")).toBeInTheDocument();

    const header = screen
      .getAllByLabelText("Przełącz regułę 1")
      .find((element) => element.tagName === "DIV");

    if (!(header instanceof HTMLDivElement)) {
      throw new Error("Expected rule header");
    }

    await user.click(header);
    fireEvent.keyDown(header, { key: "Enter" });

    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, true);
  });

  it("renders preview tiles with overflow and exposes the compact guild grid when opened", async () => {
    const user = userEvent.setup();
    const onToggleGuild = vi.fn();

    render(
      <DetectorRoutingRuleCard
        fieldIdInput=<input type="hidden" value="rule-1" />
        guilds={guilds}
        index={0}
        isOpen
        minLevel={20}
        maxLevel={80}
        onOpenChange={vi.fn()}
        onRemove={vi.fn()}
        onToggleGuild={onToggleGuild}
        selectedGuildIds={[
          "guild-1",
          "guild-2",
          "guild-3",
          "guild-4",
          "guild-5",
        ]}
        translations={translations}
        minLevelField={<div>min field</div>}
        maxLevelField={<div>max field</div>}
      />,
    );

    expect(screen.getAllByTestId("preview-guild")).toHaveLength(4);
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Na jakie serwery wysyłać")).toBeInTheDocument();
    expect(screen.getByText("min field")).toBeInTheDocument();
    expect(screen.getByText("max field")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Gamma" }));

    expect(onToggleGuild).toHaveBeenCalledWith("guild-3");
  });

  it("removes the rule without toggling the open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <DetectorRoutingRuleCard
        fieldIdInput=<input type="hidden" value="rule-1" />
        guilds={guilds}
        index={0}
        isOpen
        minLevel={20}
        maxLevel={80}
        onOpenChange={onOpenChange}
        onRemove={onRemove}
        onToggleGuild={vi.fn()}
        selectedGuildIds={["guild-1"]}
        translations={translations}
        minLevelField={<div>min field</div>}
        maxLevelField={<div>max field</div>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Usuń regułę 1" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
