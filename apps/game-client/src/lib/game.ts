import type {
  GameHero,
  GameMap,
  NpcTpl,
  GameNpc,
  GameOther,
} from "@lootlog/margonem-types";

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
    try {
      return this.interface === "ni"
        ? window.Engine.worldConfig.getWorldName()
        : window.g.worldConfig.getWorldName();
    } catch {
      // subdomain from url as fallback
      // https://<world>.margonem.pl || https://<world>.margonem.com
      const host = window.location.hostname;
      const match = host.match(/^(.*?)\.margonem\.(pl|com)$/);
      if (match && match[1]) {
        return match[1];
      }

      return "unknown";
    }
  }
}
