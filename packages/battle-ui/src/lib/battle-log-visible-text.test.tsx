// @vitest-environment happy-dom
import { normalizeSearchText } from "@lootlog/domain/text-fold";
import { createBattleWarrior } from "./battle-warrior-fixture";
import { describe, expect, it } from "vitest";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { renderToStaticMarkup } from "react-dom/server";
import battle from "@lootlog/battle-ui/i18n/translations/battle.json";
import type { RawBattleParsedEvent } from "./battle-types";
import { BattleEventEntry } from "../components/battle-event-entry";
import { buildBattleLogVisibleText } from "./battle-log-visible-text";

const attacker = createBattleWarrior({
  originalId: "1",
  name: "Łucznik <A&B>",
  team: 1,
});

const defender = createBattleWarrior({
  originalId: "2",
  name: "Żółw",
  team: 2,
});

const i18n = i18next.createInstance();

i18n.init({
  lng: "pl",
  fallbackLng: "pl",
  interpolation: { escapeValue: false },
  resources: { pl: { translation: { battle } } },
});

describe("battle log visible search text", () => {
  it("matches every line the row renders", () => {
    const event: RawBattleParsedEvent = {
      attackerId: "1",
      defenderId: "2",
      attackerHpPercentage: 67.38,
      defenderHpPercentage: 82.33,
      actions: [
        { actionType: "+crit", param: "" },
        { actionType: "+dmgd", param: "5000" },
        { actionType: "+dmgc", param: "1200" },
        { actionType: "-blok", param: "1500" },
        { actionType: "-dmgd", param: "2100" },
        { actionType: "-dmgc", param: "300" },
      ],
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
        />
      </I18nextProvider>,
    );

    expect(
      normalizeSearchText(
        buildBattleLogVisibleText({
          event,
          attacker,
          defender,
          turn: 8,
          t: i18n.t,
        }).replaceAll("\n", ""),
      ),
    ).toBe(normalizeSearchText(element.textContent ?? ""));
  });
});
