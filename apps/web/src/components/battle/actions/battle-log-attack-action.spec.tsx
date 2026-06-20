import battleTranslations from "@/i18n/translations/battle.json";
import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { renderToStaticMarkup } from "react-dom/server";
import i18next from "i18next";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { BattleLogAttackActions } from "./battle-log-attack-action";

const createTestI18n = () => {
  const instance = i18next.createInstance();
  instance.init({
    lng: "pl",
    fallbackLng: "pl",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      pl: {
        translation: {
          battle: battleTranslations,
        },
      },
    },
  });

  return instance;
};

const renderAttackActions = (
  actions: { type: string; value: string }[],
): string => {
  const attacker = {
    originalId: "38798",
    name: "zpwrama",
    lvl: 309,
    prof: "w",
    icon: "/kuf/uni_xxxiv_ork_m2.gif",
    team: 1,
  } as BattleWarrior;
  const defender = {
    originalId: "617",
    name: "Demodras",
    lvl: 306,
    prof: "b",
    icon: "/paid/her_atka_k.gif",
    team: 2,
  } as BattleWarrior;
  const event: RawBattleParsedEvent = {
    attackerId: "38798",
    defenderId: "617",
    attackerHpPercentage: 67.38,
    defenderHpPercentage: 82.33,
    actions: actions.map((action) => ({
      actionType: action.type,
      param: action.value,
    })),
  };

  return renderToStaticMarkup(
    <I18nextProvider i18n={createTestI18n()}>
      <BattleLogAttackActions
        actions={actions}
        attacker={attacker}
        defender={defender}
        event={event}
        userTeam={2}
      />
    </I18nextProvider>,
  );
};

describe("BattleLogAttackActions", () => {
  it("renders -dmga with defender data instead of raw placeholders", () => {
    const html = renderAttackActions([{ type: "-dmga", value: "982" }]);

    expect(html).toContain("Demodras(82.33%)");
    expect(html).toContain("-982");
    expect(html).toContain("obrażeń");
    expect(html).not.toContain("obrażeń od zmiażdżenia");
    expect(html).not.toContain("{{defenderName}}");
    expect(html).not.toContain("&lt;dmgo&gt;");
  });

  it("highlights glare with the same yellow style as curse", () => {
    const html = renderAttackActions([{ type: "-legbon_glare", value: "" }]);

    expect(html).toContain("-Oślepienie w następnej turze");
    expect(html).toContain("text-yellow-400");
  });

  it("renders frenzy and retaliation legendary bonuses", () => {
    const html = renderAttackActions([
      { type: "+legbon_frenzy_main", value: "5" },
      { type: "+legbon_frenzy_off", value: "5" },
      { type: "-legbon_retaliation", value: "" },
    ]);

    expect(html).toContain("+Eskalacja szału");
    expect(html).toContain("ataki ulegają wzmocnieniu");
    expect(html).toContain("ataki pomocnicze ulegają wzmocnieniu");
    expect(html).toContain("5/5");
    expect(html).toContain("-Aura odwetu");
    expect(html).toContain("text-orange-300");
    expect(html).toContain("text-purple-300");
    expect(html).not.toContain("{{value}}");
    expect(html).not.toContain("battle.+legbon_frenzy");
    expect(html).not.toContain("battle.-legbon_retaliation");
  });

  it("renders -dmga in the defender damage line without crush copy", () => {
    const html = renderAttackActions([
      { type: "-dmg", value: "20754" },
      { type: "-dmga", value: "2137" },
    ]);

    expect(html).toContain("Demodras(82.33%)");
    expect(html).toContain("-20754");
    expect(html).toContain("-2137");
    expect(html).toContain("obrażeń");
    expect(html).not.toContain("obrażeń od zmiażdżenia");
    expect(html).not.toContain("text-rose-300");
  });
});
