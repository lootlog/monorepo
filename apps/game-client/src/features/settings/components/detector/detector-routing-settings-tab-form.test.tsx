import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";
import { beforeEach, describe, expect, it } from "vitest";
import { DetectorRoutingSettingsTabForm } from "./detector-routing-settings-tab-form";
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
});

const render = () =>
  renderUi(<DetectorRoutingSettingsTabForm />, { wrapper: harness.wrapper });

const guilds: GuildIdentity[] = [
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
  {
    id: "guild-3",
    name: "Gamma",
    icon: null,
  },
  {
    id: "guild-4",
    name: "Delta",
    icon: null,
  },
  {
    id: "guild-5",
    name: "Epsilon",
    icon: null,
  },
  {
    id: "guild-6",
    name: "Zeta",
    icon: null,
  },
];

const routingRules: DetectorRoutingRule[] = [
  {
    id: "rule-1",
    name: "Bossy hero",
    minLevel: 20,
    maxLevel: 80,
    world: "Pandora",
    guildIds: ["guild-1", "guild-2", "guild-3", "guild-4", "guild-5"],
  },
  {
    id: "rule-2",
    minLevel: 120,
    maxLevel: 240,
    guildIds: ["guild-2"],
  },
];

describe("DetectorRoutingSettingsTabForm", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ hero: { accountId: "202" } });
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

  it("renders collapsed rules with level summary and guild preview overflow", async () => {
    const user = userEvent.setup();

    render();

    expect(
      screen.queryByText("Na jakie serwery wysyłać"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bossy hero")).toBeInTheDocument();
    expect(screen.queryByText("Reguła 1")).not.toBeInTheDocument();
    expect(screen.getByText("Od: 20")).toBeInTheDocument();
    expect(screen.getByText("Do: 80")).toBeInTheDocument();
    expect(screen.getByText("Świat: Pandora")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();

    await user.hover(screen.getByLabelText("Alpha"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Alpha");
  });

  it("keeps multiple rules expanded at the same time", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByText("Bossy hero"));
    await user.click(screen.getByText("Reguła 2"));

    expect(screen.getAllByText("Na jakie serwery wysyłać")).toHaveLength(2);
    expect(screen.getAllByLabelText("Nazwa reguły")).toHaveLength(2);
    expect(screen.getAllByLabelText("Od levela")).toHaveLength(2);
    expect(screen.getAllByLabelText("Do levela")).toHaveLength(2);
  });

  it("updates routing rule guilds through the dedicated tile grid", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByText("Bossy hero"));
    await user.click(
      screen.getByRole("button", {
        name: "Przełącz gildię Gamma: Włączone",
      }),
    );

    await waitFor(() => {
      expect(
        JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body)),
      ).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [
              {
                id: "rule-1",
                name: "Bossy hero",
                minLevel: 20,
                maxLevel: 80,
                world: "Pandora",
                guildIds: ["guild-1", "guild-2", "guild-4", "guild-5"],
              },
              {
                id: "rule-2",
                minLevel: 120,
                maxLevel: 240,
                guildIds: ["guild-2"],
              },
            ],
          },
        }),
      );
    });
  });

  it("opens a newly added rule and removes another one without expanding the list", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByRole("button", { name: "Dodaj regułę" }));

    expect(screen.getByText("Reguła 3")).toBeInTheDocument();
    expect(screen.getAllByText("Na jakie serwery wysyłać")).toHaveLength(1);
    expect(screen.getAllByLabelText("Od levela")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Usuń regułę 2" }));

    expect(screen.queryByText("Od 120")).not.toBeInTheDocument();
    expect(screen.queryByText("Do 240")).not.toBeInTheDocument();
    expect(screen.getAllByText("Na jakie serwery wysyłać")).toHaveLength(1);
  });

  it("updates routing rule name with trimmed value and uses it as card title", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByText("Bossy hero"));

    const nameInput = screen.getByLabelText("Nazwa reguły");
    await user.clear(nameInput);
    await user.type(nameInput, "  Gordion hero  ");
    await user.tab();

    expect(screen.getByText("Gordion hero")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body)),
      ).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [
              {
                id: "rule-1",
                name: "Gordion hero",
                minLevel: 20,
                maxLevel: 80,
                world: "Pandora",
                guildIds: [
                  "guild-1",
                  "guild-2",
                  "guild-3",
                  "guild-4",
                  "guild-5",
                ],
              },
              {
                id: "rule-2",
                minLevel: 120,
                maxLevel: 240,
                guildIds: ["guild-2"],
              },
            ],
          },
        }),
      );
    });
  });

  it("updates routing rule world with trimmed value", async () => {
    const user = userEvent.setup();

    render();

    await user.click(screen.getByText("Bossy hero"));

    const worldInput = screen.getByLabelText("Świat");
    await user.clear(worldInput);
    await user.type(worldInput, "  fobos  ");
    await user.tab();

    await waitFor(() => {
      expect(
        JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body)),
      ).toEqual(
        gameDataOperations({
          detector: {
            routingRules: [
              {
                id: "rule-1",
                name: "Bossy hero",
                minLevel: 20,
                maxLevel: 80,
                world: "fobos",
                guildIds: [
                  "guild-1",
                  "guild-2",
                  "guild-3",
                  "guild-4",
                  "guild-5",
                ],
              },
              {
                id: "rule-2",
                minLevel: 120,
                maxLevel: 240,
                guildIds: ["guild-2"],
              },
            ],
          },
        }),
      );
    });
  });
});
