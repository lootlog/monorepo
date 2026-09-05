// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { renderToStaticMarkup } from "react-dom/server";
import battle from "@/i18n/translations/battle.json";
import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { BattleEventEntry } from "../battle-event-entry";
import { buildBattleLogVisibleText } from "./battle-log-visible-text";
import { normalizeBattleLogSearchText } from "./battle-log-search";

const attacker: BattleWarrior = {
  originalId: "1",
  name: "Łucznik <A&B>",
  lvl: 100,
  prof: "h",
  icon: "",
  team: 1,
} as BattleWarrior;
const defender: BattleWarrior = {
  ...attacker,
  originalId: "2",
  name: "Żółw",
  team: 2,
};
const i18n = i18next.createInstance();
i18n.init({
  lng: "pl",
  fallbackLng: "pl",
  interpolation: { escapeValue: false },
  resources: { pl: { translation: { battle } } },
});

const cases = [
  [
    "+dmg",
    "+dmgf",
    "-dmg",
    "-dmgc",
    "+crit",
    "+thirdatt",
    "-thirdatt",
    "-endest",
  ],
  ["spell", "energy", "mana"],
  [
    "anguish",
    "critwound",
    "injure",
    "wound",
    "heal",
    "poison",
    "fire",
    "light",
  ],
  [
    "+legbon_holytouch",
    "legbon_holytouch_heal",
    "-evade",
    "-blok",
    "-legbon_facade",
    "-legbon_cleanse",
  ],
  ["dead", "winner", "flee", "unknown_action"],
];

describe("battle log visible search text", () => {
  it.each(cases)(
    "preserves the rendered Polish text for action family %j",
    (...actionTypes) => {
      const event: RawBattleParsedEvent = {
        attackerId: "1",
        defenderId: "2",
        attackerHpPercentage: 67.38,
        defenderHpPercentage: 82.33,
        actions: actionTypes.map((actionType) => ({
          actionType,
          param: "123.6,25",
        })),
      };
      const element = document.createElement("div");
      element.innerHTML = renderToStaticMarkup(
        <I18nextProvider i18n={i18n}>
          <BattleEventEntry
            event={event}
            attacker={attacker}
            defender={defender}
            eventIndex={7}
            turn={8}
            userTeam={1}
          />
        </I18nextProvider>,
      );
      expect(
        normalizeBattleLogSearchText(
          buildBattleLogVisibleText({
            event,
            attacker,
            defender,
            turn: 8,
            t: i18n.t,
          }),
        ),
      ).toBe(normalizeBattleLogSearchText(element.textContent ?? ""));
    },
  );

  it("indexes reduced damage and signed rounded values without needing a mounted row", () => {
    const event: RawBattleParsedEvent = {
      attackerId: "1",
      defenderId: "2",
      attackerHpPercentage: 100,
      defenderHpPercentage: 50,
      actions: [
        { actionType: "wound", param: "123.6,25" },
        { actionType: "+dmg", param: "55.8" },
      ],
    };
    const text = normalizeBattleLogSearchText(
      buildBattleLogVisibleText({
        event,
        attacker,
        defender,
        turn: 999,
        t: i18n.t,
      }),
    );
    expect(text).toContain("#999");
    expect(text).toContain("lucznik <a&b>");
    expect(text).toContain("124");
    expect(text).toContain("25");
    expect(text).toContain("+56");
  });
});
