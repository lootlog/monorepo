// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import groupFights from "@/i18n/translations/group-fights.json";
import { GroupFightRanking } from "./group-fight-ranking";

afterEach(cleanup);

it("shows the member total alongside separate character results and participation time", async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: "pl",
    resources: { pl: { translation: { groupFights } } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <GroupFightRanking
        ranking={[
          {
            memberId: 1,
            memberUserId: "user-1",
            memberName: "Member",
            memberAvatar: null,
            fights: 3,
            wins: 2,
            losses: 1,
            draws: 0,
            flees: 1,
            winRate: 66.6667,
            totalSeconds: 90,
            lastFightAt: null,
            characters: [
              {
                characterId: "1",
                name: "Warrior",
                lvl: 100,
                prof: "w",
                icon: "",
                world: "classic",
                fights: 2,
                wins: 2,
                losses: 0,
                draws: 0,
                flees: 0,
                totalSeconds: 60,
              },
              {
                characterId: "2",
                name: "Mage",
                lvl: 90,
                prof: "m",
                icon: "",
                world: "classic",
                fights: 1,
                wins: 0,
                losses: 1,
                draws: 0,
                flees: 1,
                totalSeconds: 30,
              },
            ],
          },
        ]}
      />
    </I18nextProvider>,
  );
  expect(
    screen.getByRole("region", { name: groupFights.ranking }).tabIndex,
  ).toBe(0);
  const row = screen.getByRole("row", { name: /Member/ });
  expect(within(row).getByRole("cell", { name: "66,7%" })).toBeDefined();
  const characters = within(row).getAllByRole("listitem");
  expect(characters[0]?.textContent).toContain("Warrior (100w, classic)");
  expect(characters[0]?.textContent).toContain("Czas: 60 s");
  expect(characters[1]?.textContent).toContain("Ucieczki: 1");
  expect(characters[1]?.textContent).toContain("Porażki: 1");
  expect(characters[1]?.textContent).toContain("Czas: 30 s");
});
