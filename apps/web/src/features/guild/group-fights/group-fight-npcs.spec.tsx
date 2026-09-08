// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import groupFights from "@/i18n/translations/group-fights.json";
import { GroupFightNpcs } from "./group-fight-npcs";

afterEach(cleanup);

const npcs = [
  {
    name: "Jotun",
    npcType: "ELITE2" as const,
    lvl: 70,
    icon: "e2/kam_olbrzym-b.gif",
    mapId: 101,
    mapName: "Kamienna Jaskinia - sala 3",
    totalFights: 12,
    wins: 7,
    losses: 3,
    draws: 2,
    flees: 1,
    totalDurationSeconds: 600,
  },
  {
    name: "Zabójczy Królik",
    npcType: "TITAN" as const,
    lvl: 70,
    icon: "tyt/zabojczy_krolik.gif",
    mapId: 102,
    mapName: "Jaskinia Caerbannoga",
    totalFights: 4,
    wins: 1,
    losses: 3,
    draws: 0,
    flees: 0,
    totalDurationSeconds: 200,
  },
];

const renderNpcs = async (
  props: Partial<Parameters<typeof GroupFightNpcs>[0]> = {},
) => {
  const i18n = createInstance();
  await i18n.init({
    lng: "pl",
    resources: { pl: { translation: { groupFights } } },
  });
  const onSelect = props.onSelect ?? vi.fn();
  const onClear = props.onClear ?? vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <GroupFightNpcs
          guildId="guild-1"
          filters={{ period: "all" }}
          npcs={props.npcs ?? npcs}
          selectedNpcName={props.selectedNpcName}
          onSelect={onSelect}
          onClear={onClear}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  );
  return { onSelect, onClear };
};

it("lists each npc with its level, map and outcome counts", async () => {
  await renderNpcs();
  const row = screen.getByRole("row", { name: /Jotun/ });
  expect(within(row).getByRole("img", { name: "Jotun" })).toBeDefined();
  expect(row.textContent).toContain("Poziom 70");
  expect(row.textContent).toContain("Kamienna Jaskinia - sala 3");
  expect(within(row).getByRole("cell", { name: "7" })).toBeDefined();
  expect(within(row).getByRole("cell", { name: "3" })).toBeDefined();
  expect(
    screen.getByRole("row", { name: /Zabójczy Królik/ }).textContent,
  ).toContain("Tytani");
});

it("selects an npc and clears the selection", async () => {
  const { onSelect } = await renderNpcs();
  screen
    .getByRole("button", {
      name: groupFights.selectNpc.replace("{{name}}", "Jotun"),
    })
    .click();
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Jotun" }),
  );

  cleanup();
  const { onClear } = await renderNpcs({ selectedNpcName: "Jotun" });
  screen.getAllByRole("button", { name: groupFights.clearNpc })[0]?.click();
  expect(onClear).toHaveBeenCalled();
});
