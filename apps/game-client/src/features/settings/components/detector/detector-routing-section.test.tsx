import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";
import { beforeEach, describe, expect, it } from "vitest";
import { DetectorRoutingSection } from "./detector-routing-section";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  readSeededSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { createGameAccountPreferences } from "@/test/game-account-preferences-fixtures";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const gameDataOperations = (set: {
  detector: { routingRules: DetectorRoutingRule[] };
}) => ({
  operations: [
    {
      domain: "gameData",
      scope: { type: "GAME_ACCOUNT", id: "202" },
      set,
      unset: [],
    },
  ],
  context: { gameAccountId: "202", characterId: "101" },
});

const render = () =>
  renderUi(<DetectorRoutingSection />, { wrapper: harness.wrapper });

const guilds: GuildIdentity[] = [
  { id: "guild-1", name: "Alpha", icon: null },
  { id: "guild-2", name: "Beta", icon: null },
  { id: "guild-3", name: "Gamma", icon: null },
  { id: "guild-4", name: "Delta", icon: null },
  { id: "guild-5", name: "Epsilon", icon: null },
  { id: "guild-6", name: "Zeta", icon: null },
];

const firstRule: DetectorRoutingRule = {
  id: "rule-1",
  name: "Bossy hero",
  minLevel: 20,
  maxLevel: 80,
  world: "Pandora",
  guildIds: ["guild-1", "guild-2", "guild-3", "guild-4", "guild-5"],
};

const secondRule: DetectorRoutingRule = {
  id: "rule-2",
  minLevel: 120,
  maxLevel: 240,
  guildIds: ["guild-2"],
};

const routingRules: DetectorRoutingRule[] = [firstRule, secondRule];

const savedBody = () =>
  JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));

describe("DetectorRoutingSection", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ hero: { accountId: "202" }, world: "fobos" });
    harness.queryClient.setQueryData(harness.guildsKey, guilds);

    seedSettingsDocuments(
      harness.queryClient,
      createSettingsDocuments(
        accountPreferenceValues(
          createGameAccountPreferences("202", {
            detector: { ...createDetectorSettings(), routingRules },
          }),
        ),
      ),
    );
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
  });

  it("shows every rule expanded with its own name, levels and Lootlogi", () => {
    render();

    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
    expect(screen.getAllByLabelText("Nazwa reguły")).toHaveLength(2);
    expect(screen.getAllByLabelText("Od levela")).toHaveLength(2);
    expect(screen.getAllByLabelText("Do levela")).toHaveLength(2);
    expect(screen.getByLabelText("Lootlogi: Bossy hero")).toBeInTheDocument();
    expect(screen.getByLabelText("Lootlogi: Reguła 2")).toBeInTheDocument();
  });

  it("clamps a committed level to the allowed range before saving", async () => {
    const user = userEvent.setup();

    render();

    const maxLevel = screen.getAllByLabelText("Do levela")[0];
    await user.clear(maxLevel);
    await user.type(maxLevel, "9999");
    expect(harness.request).not.toHaveBeenCalled();
    await user.tab();

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [{ ...firstRule, maxLevel: 500 }, secondRule],
          },
        }),
      );
    });
  });

  it("keeps the range ordered when the lower bound is typed above the upper one", async () => {
    const user = userEvent.setup();

    render();

    const minLevel = screen.getAllByLabelText("Od levela")[0];
    await user.clear(minLevel);
    await user.type(minLevel, "100");
    await user.tab();

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [
              { ...firstRule, minLevel: 80, maxLevel: 100 },
              secondRule,
            ],
          },
        }),
      );
    });
  });

  it("updates routing rule guilds through the guild picker", async () => {
    const user = userEvent.setup();

    render();

    await user.click(
      screen.getByRole("button", { name: "Gamma", pressed: true }),
    );

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [
              {
                ...firstRule,
                guildIds: ["guild-1", "guild-2", "guild-4", "guild-5"],
              },
              secondRule,
            ],
          },
        }),
      );
    });
  });

  it("warns that a new rule sends nothing until a Lootlog is chosen, and removes a rule", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByRole("button", { name: "Dodaj regułę" }));

    expect(screen.getByLabelText("Lootlogi: Reguła 3")).toBeInTheDocument();
    expect(
      screen.getByText("Nic nie wysyła – zaznacz Lootloga"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Usuń regułę Reguła 2" }),
    );

    expect(
      screen.queryByRole("button", { name: "Usuń regułę Reguła 3" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Nazwa reguły")).toHaveLength(2);
  });

  it("updates routing rule name with trimmed value and uses it as the rule name", async () => {
    const user = userEvent.setup();

    render();

    const nameInput = screen.getAllByLabelText("Nazwa reguły")[0];
    await user.clear(nameInput);
    await user.type(nameInput, "  Gordion hero  ");
    await user.tab();

    expect(screen.getByLabelText("Lootlogi: Gordion hero")).toBeInTheDocument();

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [{ ...firstRule, name: "Gordion hero" }, secondRule],
          },
        }),
      );
    });
  });

  it("updates routing rule world with trimmed value", async () => {
    const user = userEvent.setup();

    render();

    const worldInput = screen.getAllByLabelText("Świat")[0];
    await user.clear(worldInput);
    await user.type(worldInput, "  fobos  ");
    await user.tab();

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [{ ...firstRule, world: "fobos" }, secondRule],
          },
        }),
      );
    });
  });

  it("fills the world with the one the player is on", async () => {
    const user = userEvent.setup();

    render();

    await user.click(
      screen.getAllByRole("button", { name: "Wstaw aktualny świat" })[0],
    );

    await waitFor(() => {
      expect(savedBody()).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [{ ...firstRule, world: "Fobos" }, secondRule],
          },
        }),
      );
    });
  });
});
