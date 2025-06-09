import { GameHero } from "@/types/margonem/hero";
import { GameMap } from "@/types/margonem/map";
import { GameNpc } from "@/types/margonem/npcs";
import { GameOther } from "@/types/margonem/others";

export class Game {
  static get interface() {
    return typeof window.Engine === "object" ? "ni" : "si";
  }

  static get hero(): GameHero {
    return this.interface == "ni" ? window.Engine.hero.d : window.hero;
  }

  static get map(): GameMap {
    return this.interface == "ni" ? window.Engine.map.d : window.map;
  }

  static getOther(key: string): GameOther {
    if (this.interface == "ni") {
      const othersData = window.Engine.others.check();
      return othersData[key]?.d;
    } else {
      return window.g.other[key];
    }
  }

  static getNpc(key: number): GameNpc {
    return this.interface == "ni"
      ? window.Engine.npcs.getById(key).d
      : window.g.npc[key];
  }
}
