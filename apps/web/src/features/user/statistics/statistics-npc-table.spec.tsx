// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import "@/i18n/config";
import { StatisticsNpcTable } from "./statistics-npc-table";
afterEach(cleanup);
it("keeps live total and aligned comparison distinct without inventing growth percentages", () => {
  render(
    <StatisticsNpcTable
      npcs={[
        {
          world: "pandora",
          npcId: 1,
          npcName: "Testowy potwór",
          npcType: "HERO",
          npcLvl: 100,
          npcProf: null,
          npcIcon: null,
          totalKills: 12,
          comparisonKills: 10,
          previousKills: 0,
          deltaKills: 10,
          deltaPercent: null,
          share: 25,
          bestDay: { date: "2026-09-01", kills: 8 },
        },
      ]}
    />,
  );
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getAllByText("10")).toHaveLength(2);
  expect(screen.getByText("25%", { exact: false })).toBeTruthy();
  expect(screen.getByText("—")).toBeTruthy();
});
