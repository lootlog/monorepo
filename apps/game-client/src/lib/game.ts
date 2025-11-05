import type { GameHero } from "@/types/margonem/hero";
import type { GameMap } from "@/types/margonem/map";
import type { NpcTpl } from "@/types/margonem/npc-tpl-manager";
import type { GameNpc } from "@/types/margonem/npcs";
import type { GameOther } from "@/types/margonem/others";

export class Game {
  static get interface() {
    return typeof window.Engine === "object" ? "ni" : "si";
  }

  static getInitializeState(): boolean {
    return (
      window.Engine?.interface?.alreadyInitialised ||
      window.Engine?.interface?.getAlreadyInitialised?.() ||
      window.g?.init === 5
    );
  }

  static get hero(): GameHero {
    return this.interface === "ni" ? window.Engine.hero.d : window.hero;
  }

  static get map(): GameMap {
    return this.interface === "ni" ? window.Engine.map.d : window.map;
  }

  static get npcs(): GameNpc[] {
    if (this.interface === "ni") {
      return window.Engine.npcs.getDrawableList().map((npc) => npc.d);
    } else {
      return Object.values(window.g.npc);
    }
  }

  static getOther(key: string): GameOther {
    if (this.interface === "ni") {
      const othersData = window.Engine.others.check();
      return othersData[key]?.d;
    } else {
      return window.g.other?.[key];
    }
  }

  static getNpc(key: number): GameNpc | undefined {
    return this.interface === "ni"
      ? window.Engine.npcs.getById(key)?.d
      : window.g.npc?.[key];
  }

  static getNpcTpl(key: number): NpcTpl | undefined {
    return this.interface === "ni"
      ? window.Engine.npcTplManager.getNpcTpl(key)
      : window.g.npcTplManager.getNpcTpl(key);
  }

  static getNpcIcon(key: number): string | undefined {
    return this.interface === "ni"
      ? window.Engine.npcIconManager.getNpcIcon(key)
      : window.g.npcIconManager.getNpcIcon(key);
  }

  static getWorldName(): string {
    return this.interface === "ni"
      ? window.Engine.worldConfig.getWorldName()
      : window.g.worldConfig.getWorldName();
  }
}
