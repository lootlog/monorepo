import type { GameHero } from "@lootlog/margonem/hero";
import type { GameMap } from "@lootlog/margonem/map";
import { getMargonemInterface } from "@/lib/margonem-runtime/runtime-adapter";
import { useGameStore } from "@/store/game.store";

/**
 * Compatibility view for UI code that has not yet migrated to `game.store`.
 * Runtime integration code must use adapters, envelopes and domain stores.
 */
export class Game {
  static get interface() {
    return getMargonemInterface();
  }

  static get hero(): GameHero {
    const hero = useGameStore.getState().game?.hero;
    if (!hero) return undefined as unknown as GameHero;
    return {
      account: Number(hero.accountId),
      id: Number(hero.characterId),
      img: hero.icon,
      lvl: hero.level,
      nick: hero.name,
      prof: hero.profession,
      warrior_stats: {
        hp: hero.currentHp,
        maxhp: hero.maxHp,
      },
    } as GameHero;
  }

  static getAccountId(): string | null {
    return useGameStore.getState().game?.hero.accountId ?? null;
  }

  static get map(): GameMap {
    return useGameStore.getState().game?.map as GameMap;
  }

  static getWorldName(): string {
    return useGameStore.getState().game?.world ?? "unknown";
  }
}
