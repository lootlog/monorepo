import { createTranslationLookup } from "@lootlog/ui/i18n/translation-lookup";
import itemStats from "@lootlog/ui/i18n/translations/item-stats.json";
import { describe, expect, it } from "vitest";
import {
  getItemStatTemplateValues,
  mapStatsToDisplaySections,
  parseItemStats,
  SUPPORTED_ITEM_STAT_KEYS,
  type ItemDisplayValue,
} from "./item-stat-utils";

const translations = createTranslationLookup(itemStats);

function resolveTranslation(path: string): string | undefined {
  return translations.get(path.replace(/^itemStats\./, ""));
}

function expectTranslated(displayValue: ItemDisplayValue) {
  expect(displayValue.key).toBeDefined();
  expect(resolveTranslation(displayValue.key ?? "")).toBeDefined();
}

function getTranslatedValuePaths(displayValue: ItemDisplayValue): string[] {
  if (!displayValue.translateKey || !Array.isArray(displayValue.value)) {
    return [];
  }

  return displayValue.value.map(
    (valueKey) => `${displayValue.translateKey}.${valueKey}`,
  );
}

describe("item stat utilities", () => {
  it("uses the canonical Margonem wording for damage modifiers", () => {
    expect(itemStats).toMatchObject({
      combo_multiplier: "Obrażenia nieuchronne <value>{{value}}%</value>",
      dmgmul: "Wszystkie obrażenia <value>{{value}}%</value>",
      dmgmulabsolute: "Obrażenia nieuchronne <value>{{value}}%</value>",
      dmgmulfire: "Obrażenia od ognia <value>{{value}}%</value>",
      dmgmulfrost: "Obrażenia od zimna <value>{{value}}%</value>",
      dmgmullight: "Obrażenia od błyskawic <value>{{value}}%</value>",
      dmgmulphysical: "Obrażenia fizyczne <value>{{value}}%</value>",
      dmgmulpoison: "Obrażenia od trucizny <value>{{value}}%</value>",
      dmgmulwound: "Obrażenia od głębokiej rany <value>{{value}}%</value>",
    });
  });

  it("keeps source wording for actions, metadata and legendary bonuses", () => {
    expect(itemStats).toMatchObject({
      action: {
        auction: "Akcja: Wywołanie aukcji",
        flee: "Akcja walki: Przerwanie walki - ucieczka",
      },
      add_battleset: "Akcja: Odblokowanie zestawu do walki",
      noauction: "Tego przedmiotu nie można wystawić na aukcję",
      nodepo: "Przedmiotu nie można przechowywać w depozycie",
      townlimit: "Działa tylko w wybranych lokacjach",
      custom_teleport: {
        set: "<description>Teleportuje Postać na mapę:\n{{value4}} ({{value2}}, {{value3}}).</description>",
      },
      legbon: {
        dmgred:
          "<legbon>Fizyczna osłona: przyjmowane obrażenia fizyczne zmniejszone o <value>{{value}}%</value>.</legbon>",
        retaliation:
          "<legbon>Aura odwetu: przyjęcie ataku ma <value>{{value}}%</value> szansy na odbicie w przeciwnika otrzymanych obrażeń.</legbon>",
      },
    });
  });

  it("preserves stat formatting across tooltip sections", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats(
        "created=1767225600;hp=10;dmg=5,8;lvl=20;reqp=wm;opis=Created #YEAR#[br]Line;teleport=x,10,20,Karka-han;legbon=curse,1;amount=2;lvlupgs=3;unknown=value;rarity=legendary;rkey=x",
      ),
    );

    expect(sections.find(({ index }) => index === 1)?.values).toEqual([
      { key: "dmg", value: "5 - 8" },
    ]);
    expect(sections.find(({ index }) => index === 3)?.values).toEqual([
      { key: "hp", value: "10" },
    ]);
    expect(sections.find(({ index }) => index === 9)?.values).toEqual([
      { key: "reqp", translateKey: "itemStats.prof", value: ["w", "m"] },
      { key: "lvl", value: "20" },
    ]);
    expect(sections.find(({ index }) => index === 7)?.values).toEqual([
      { key: "teleport", value: ["x", "10", "20", "Karka-han"] },
      { key: "opis", value: "Created 2026\nLine" },
    ]);
    expect(sections.find(({ index }) => index === 5)?.values).toEqual([
      { key: "legbon.curse", value: 9 },
    ]);
    expect(sections.find(({ index }) => index === 4)?.values).toEqual([
      { key: "amount", value: "2" },
      { key: "lvlupgs", value: "3" },
    ]);
    expect(sections.find(({ index }) => index === 10)?.values).toEqual([
      { key: "unknown", value: "value" },
    ]);
  });

  it("uses Margonem section and stat order instead of raw input order", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats(
        "unknown=x;lvl=20;permbound;opis=Opis;legbon=curse;amount=1;wound=5,10;hp=20;crit=2;lowreq=3",
      ),
    );

    expect(sections.map(({ index }) => index)).toEqual([
      0, 3, 4, 5, 7, 8, 9, 10,
    ]);
    expect(sections[1]?.values.map(({ key }) => key)).toEqual([
      "crit",
      "hp",
      "wound",
    ]);
  });

  it("keeps etiquette in a separate section after the item description", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats(
        "permbound;etiquette=event|Wakacje 2026 r.;opis=Opis przedmiotu",
      ),
    );

    expect(sections).toEqual([
      { index: 7, values: [{ key: "opis", value: "Opis przedmiotu" }] },
      {
        index: 7.5,
        values: [{ key: "etiquette", value: "Wakacje 2026 r." }],
      },
      { index: 8, values: [{ key: "permbound", value: true }] },
    ]);
  });

  it("uses source class casing and Polish bag inflection", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats("bag=1;btype=1,8;target_class=1,8"),
    );

    expect(sections.find(({ index }) => index === 3)?.values).toEqual([
      { key: "bag.one", value: "1" },
    ]);
    expect(sections.find(({ index }) => index === 4)?.values).toEqual([
      {
        key: "btype",
        translateKey: "itemStats.classLower",
        value: ["oneHanded", "armor"],
      },
    ]);
    expect(sections.find(({ index }) => index === 9)?.values).toEqual([
      {
        key: "target_class",
        translateKey: "itemStats.class",
        value: ["oneHanded", "armor"],
      },
    ]);
  });

  it("formats missing combat, enhancement, action and metadata families", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats(
        "dmgmul=-5;afterheal2=10,250;resmanaendest=9;leczy=-120;bonus=sa,250;action=fightperheal,10,20;expire_duration=2d;expire_date=1767225600;target_class=WEAPONS;cansplit=0;enhancement_refund=3;custom_teleport=id,12,34,Tuzmer;socket_content=0;enhancement_upgrade_lvl=4;nodepoclan",
      ),
    );

    expect(
      sections
        .filter(({ index }) => index >= 1 && index <= 3)
        .flatMap(({ values }) => values),
    ).toEqual(
      expect.arrayContaining([
        { key: "dmgmul", value: "-5" },
        { key: "afterheal2", value: ["10", "250"] },
        { key: "resmanaendest", value: ["9", "4"] },
        { key: "truje", value: "120" },
        { key: "action.fightHealRange", value: ["10", "20"] },
        { key: "expire_duration.d", value: "2" },
        { key: "expire_date", value: "01.01.2026, 01:00" },
      ]),
    );
    expect(sections.find(({ index }) => index === 4)?.values).toEqual([
      { key: "bonus.sa", value: "2.5" },
      { key: "cansplit.no", value: false },
      { key: "enhancement_refund.multiple", value: "3" },
    ]);
    expect(sections.find(({ index }) => index === 5)?.values).toEqual([
      { key: "socket_content.empty", value: false },
    ]);
    expect(sections.find(({ index }) => index === 7)?.values).toEqual([
      { key: "custom_teleport.set", value: ["id", "12", "34", "Tuzmer"] },
    ]);
    expect(sections.find(({ index }) => index === 8)?.values).toEqual([
      { key: "enhancement_upgrade_lvl", value: "4" },
      { key: "nodepoclan", value: true },
    ]);
    expect(sections.find(({ index }) => index === 9)?.values).toEqual([
      {
        key: "target_class",
        translateKey: "itemStats.class",
        value: ["allWeapons"],
      },
    ]);
  });

  it("formats description dates in the Warsaw timezone", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats(
        "created=1735687800;opis=#DATE#|#YEAR#|#YEAR,-1,D#|#YEAR,12,M#",
      ),
    );

    expect(sections.find(({ index }) => index === 7)?.values).toEqual([
      {
        key: "opis",
        value: "01.01.2025, 00:30|2025|2024|2026",
      },
    ]);
  });

  it("selects the outfit hour form from the rounded hour count", () => {
    const sections = mapStatsToDisplaySections(
      parseItemStats("outfit=299,x,Tuzmer"),
    );

    expect(sections.find(({ index }) => index === 3)?.values).toEqual([
      { key: "outfit.hours", value: ["5", " w Tuzmer"] },
    ]);
  });

  it("supports every legendary bonus and an explicit unknown fallback", () => {
    const bonusNames = [
      "anguish",
      "cleanse",
      "critred",
      "curse",
      "dmgred",
      "facade",
      "frenzy",
      "glare",
      "holytouch",
      "lastheal",
      "puncture",
      "pushback",
      "resgain",
      "retaliation",
      "verycrit",
      "future-bonus",
    ];

    const values = mapStatsToDisplaySections(
      bonusNames.map((bonusName) => ({ key: "legbon", value: bonusName })),
    ).flatMap(({ values }) => values);

    expect(values.map(({ key }) => key)).toEqual([
      ...bonusNames.slice(0, -1).map((bonusName) => `legbon.${bonusName}`),
      "legbon.not-supported",
    ]);
    values.forEach(expectTranslated);
  });

  it("recognizes every registered stat and emits only translated display keys", () => {
    const sampleValues = new Map(
      Object.entries({
        action: "fatigue,-5",
        bonus: "enfatig,5,10",
        btype: "1,8",
        custom_teleport: "id,10,20,Karka-han",
        enhancement_refund: "2",
        expaddlvl: "100,2",
        expire_duration: "2d",
        expires: "4102444800",
        legbon: "retaliation",
        loot: "Gracz,x,3,1767225600,Tytan",
        opis: "Opis #YEAR#",
        outfit: "120,x,Tuzmer",
        pet: "x,x,zadanie#1|zadanie#2,quest",
        reqp: "wm",
        socket_content: "0",
        socket_fleeting_legbon: "curse",
        socket_injection_legbon: "dmgred",
        target_class: "1,8",
        target_rarity: "heroic",
        teleport: "x,10,20,Karka-han",
      }),
    );

    const stats = SUPPORTED_ITEM_STAT_KEYS.map((key) => ({
      key,
      value: sampleValues.get(key) ?? "1",
    }));

    const sections = mapStatsToDisplaySections(stats);
    const displayValues = sections.flatMap(({ values }) => values);

    expect(sections.find(({ index }) => index === 10)).toBeUndefined();
    displayValues.forEach(expectTranslated);

    for (const translationPath of displayValues.flatMap(
      getTranslatedValuePaths,
    )) {
      expect(resolveTranslation(translationPath)).toBeDefined();
    }
  });
});

describe("item stat template values", () => {
  const translate = (key: string, fallback: string) =>
    key === "prof.w" ? "Wojownik" : fallback;

  it("formats numeric ranges without altering descriptions or scalar types", () => {
    for (const [value, expected] of [
      ["1000 - 2500", "1 000 - 2 500"],
      ["Map 1000", "Map 1000"],
      [false, false],
      [12, 12],
      [undefined, undefined],
    ] as const) {
      expect(
        getItemStatTemplateValues({ key: "hp", value }, translate),
      ).toEqual({
        value: expected,
      });
    }
  });

  it("retains positional placeholders and translation fallback", () => {
    expect(
      getItemStatTemplateValues(
        { key: "teleport", value: ["1000", "Town"] },
        translate,
      ),
    ).toEqual({ value1: "1 000", value2: "Town" });
    expect(
      getItemStatTemplateValues(
        { key: "reqp", value: ["w", "unknown"], translateKey: "prof" },
        translate,
      ),
    ).toEqual({ value: "Wojownik,\u00a0unknown" });
  });
});
