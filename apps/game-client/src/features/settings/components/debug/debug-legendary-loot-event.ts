import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";

export const createDebugLegendaryLootEvent = (
  game: RuntimeGameSnapshot,
): GameEvent => {
  const { hero } = game;
  const characterId = Number(hero.characterId);
  const lootId = crypto.randomUUID().replaceAll("-", "");

  return {
    e: "ok",
    ev: Date.now(),
    f: {
      init: "1",
      endBattle: 1,
      w: {
        "-308570": {
          id: -308570,
          originalId: 308570,
          name: "Czciciel Charkhaam",
          icon: "hum/barb3.gif",
          hpp: 0,
          prof: "h",
          lvl: 279,
          wt: 2,
          type: 2,
          team: 1,
        },
        "-308572": {
          id: -308572,
          originalId: 308572,
          name: "Smokoszczęki",
          icon: "hum/barb4a.gif",
          hpp: 0,
          prof: "w",
          lvl: 278,
          wt: 0,
          type: 2,
          team: 1,
        },
        "-115103": {
          id: -115103,
          originalId: 115103,
          name: "Vaenra Charkhaam",
          icon: "e2/bar_smoczyca.gif",
          hpp: 0,
          prof: "m",
          lvl: 280,
          wt: 21,
          type: 2,
          team: 1,
        },
        [hero.characterId]: {
          id: characterId,
          originalId: characterId,
          name: hero.name,
          icon: hero.icon,
          hpp: Math.floor((hero.currentHp / hero.maxHp) * 100),
          prof: hero.profession,
          lvl: hero.level,
          wt: 0,
          type: 0,
          team: 0,
        },
      },
    },
    loot: {
      source: "fight",
      states: { [lootId]: 1 },
    },
    item: {
      [lootId]: {
        tpl: 62036,
        hid: lootId + crypto.randomUUID().replaceAll("-", ""),
        icon: "zbr/zbroja1602.gif",
        name: "Szaty wyznawcy Hebrehotha",
        own: characterId,
        pr: 718405,
        prc: "zl",
        stat: "absorb=7060;absorbm=3530;ac=1177;binds;crit=3;heal=691;hp=2301;lvl=280;manabon=93;rarity=legendary;reqp=m;resfire=6;resfrost=8;sa=78",
        cl: 8,
        st: 0,
        loc: "l",
      },
    },
  };
};
