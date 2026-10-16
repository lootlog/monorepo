// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { UserLootStatsResponseDtoOutputLegendsItem } from "@lootlog/client/main";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import "@/i18n/config";
import { StatisticsLegendsTable } from "./statistics-legends-table";
import type { StatisticsSortValue } from "./statistics-sort";

/** Holds the sort the statistics page keeps in its URL. */
function SortedLegendsTable({
  legends,
}: {
  legends: UserLootStatsResponseDtoOutputLegendsItem[];
}) {
  const [sort, setSort] = useState<StatisticsSortValue>({
    field: "legends",
    asc: false,
  });

  return (
    <StatisticsLegendsTable
      legends={legends}
      sort={sort}
      onSortChange={setSort}
    />
  );
}

afterEach(cleanup);

let nextId = 1;

const legend = (
  name: string,
  counts: { count: number; caught: number; npcKills: number },
): UserLootStatsResponseDtoOutputLegendsItem => ({
  itemId: nextId++,
  name,
  icon: "legend.png",
  stat: "",
  type: null,
  world: "tempest",
  npc: {
    id: nextId++,
    name: `${name} NPC`,
    lvl: 100,
    icon: null,
  },
  ...counts,
});

const itemOrder = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent);

it("orders the legends by the column the player picks, flipping on a second click", () => {
  render(
    <SortedLegendsTable
      legends={[
        legend("Often", { count: 3, caught: 0, npcKills: 10 }),
        legend("Caught", { count: 2, caught: 2, npcKills: 5 }),
        legend("Hunted", { count: 1, caught: 1, npcKills: 300 }),
      ]}
    />,
  );

  expect(itemOrder()).toEqual(["Often", "Caught", "Hunted"]);
  fireEvent.click(screen.getByRole("button", { name: "Bicia potwora" }));
  expect(itemOrder()).toEqual(["Hunted", "Often", "Caught"]);
  fireEvent.click(screen.getByRole("button", { name: "Złapane" }));
  expect(itemOrder()).toEqual(["Caught", "Hunted", "Often"]);
  fireEvent.click(screen.getByRole("button", { name: "Złapane" }));
  expect(itemOrder()).toEqual(["Often", "Hunted", "Caught"]);
});
