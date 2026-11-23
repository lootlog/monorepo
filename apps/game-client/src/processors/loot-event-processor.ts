import { getNpcType, MIN_LOOT_NPC_WT } from "@lootlog/domain/npc-type";
import { getProfByShortname } from "@lootlog/domain/profession";
import { resolveLootAcceptance } from "@lootlog/domain/loot-acceptance";
import { capturesMapPlayers } from "@lootlog/domain/loot-draw";
import { getFreshCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import {
  CreateLootDtoSource,
  type CreateLootDtoMapPlayersSnapshotItem,
} from "@lootlog/client/main";
import { getApiErrorStringField } from "@lootlog/client/transport";
import { NpcType } from "@/api/npcs.api";
import {
  RejectedLootMemory,
  type LootAcceptanceKey,
} from "@/processors/rejected-loot-memory";
import { itemStatValue } from "@lootlog/domain/item-stat";
import { useOthersStore } from "@/store/others.store";
import {
  createLootDebugContext,
  logLootCreateDebug,
  type LootCreateDebugContext,
} from "@/lib/loot-create-debug";
import { getLoot } from "@/utils/game/get-loots";
import {
  getBattleParticipants,
  type Npc,
  type PartyMember,
} from "@/utils/game/get-battle-participants";
import type { GameEvent, LootEvent } from "@lootlog/margonem/game-events";
import { createLoot } from "@/api/loot.api";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { reportSubmissionOutcome } from "@/store/game-store/submission-feedback.store";
import {
  useDialogStore,
  type DialogNpcContextSource,
} from "@/store/game-store/dialog.store";
import { useNpcsStore } from "@/store/npcs.store";
import type {
  RuntimeGameSnapshot,
  RuntimeIngressSnapshot,
  RuntimeNpc,
} from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";
import { resolveDialogLootNpcLevel } from "@/utils/game/resolve-dialog-loot-npc-level";

const LOOT_SOURCE_BY_EVENT_SOURCE = {
  dialog: CreateLootDtoSource.DIALOG,
  lootbox: CreateLootDtoSource.LOOTBOX,
  fight: CreateLootDtoSource.FIGHT,
} satisfies Record<LootEvent["source"], CreateLootDtoSource>;

const NO_LOOTLOG_ACCEPTS_LOOT_CODE = "NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT";

export class LootEventProcessor {
  private readonly rejectedLoots = new RejectedLootMemory();

  handleLootFromBattle(
    event: GameEvent,
    ingress?: RuntimeIngressSnapshot,
  ): void {
    if (!event.item || event.loot?.source !== "fight") return;

    const debugContext = createLootDebugContext("fight");
    const battleStore = useBattleStore.getState();
    const lootStore = useLootStore.getState();
    const game = useGameStore.getState().game ?? ingress?.game;

    logLootCreateDebug("event-detected", {
      ...debugContext,
      battleWarriors: battleStore.battleWarriors,
      event,
    });

    if (Object.keys(battleStore.battleWarriors).length === 0) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-battle-warriors",
      });

      return;
    }

    lootStore.setLastLootId(null);

    if (!game) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-runtime-game-snapshot",
      });

      return;
    }

    this.createLootFromBattle(event, debugContext, game);
  }

  handleDialogLoot(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    if (!event.item || event.loot?.source !== "dialog") return;

    const debugContext = createLootDebugContext("dialog");
    const dialogStore = useDialogStore.getState();
    const game = ingress?.game ?? useGameStore.getState().game;
    const eventNpcDelIds = (event.npcs_del ?? []).map((npc) => npc.id);
    logLootCreateDebug("event-detected", {
      ...debugContext,
      dialogNpcContext: dialogStore.npcContext,
      event,
      eventNpcDelIds,
    });

    if (!dialogStore.npcContext) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds,
        reason: "missing-dialog-npc-context",
      });

      return;
    }

    const lootStore = useLootStore.getState();
    lootStore.setLastLootId(null);

    const { npcContext } = dialogStore;

    const npc =
      npcContext.npc ??
      ingress?.npcsById[npcContext.npcId] ??
      useNpcsStore.getState().getMapNpc(npcContext.npcId);

    const resolutionSource: DialogNpcContextSource = npcContext.npc
      ? npcContext.source
      : "fallback-lookup";

    if (!npc || Object.keys(npc).length === 0) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds,
        npcId: npcContext.npcId,
        reason: "missing-dialog-npc-snapshot",
        resolutionSource,
      });

      return;
    }

    if (!game) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-runtime-game-snapshot",
      });

      return;
    }

    this.createLootFromDialog(event, {
      debugContext,
      eventNpcDelIds,
      game,
      npcData: npc,
      resolutionSource,
    });
  }

  private createLootFromBattle(
    event: GameEvent,
    debugContext: LootCreateDebugContext,
    game: RuntimeGameSnapshot,
  ): void {
    const loot = event.loot;

    if (!loot) return;

    if (!event.f) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "missing-fight-data",
      });

      return;
    }

    const loots = getLoot(event.item, loot);

    if (!loots.length) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "empty-parsed-loots",
      });

      return;
    }

    const battleStore = useBattleStore.getState();

    const { npcs, party } = getBattleParticipants(
      battleStore.battleWarriors,
      game,
    );

    const acceptance = this.resolveAcceptance(npcs, loots, game, debugContext);

    if (acceptance.rejected) return;

    const { hero, map, gameVersion } = game;

    if (gameVersion === null) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        reason: "unknown-game-version",
      });

      return;
    }

    const payload = {
      world: game.world,
      gameVersion,
      source: LOOT_SOURCE_BY_EVENT_SOURCE[loot.source],
      location: map.name,
      npcs,
      loots,
      players: party,
      ...this.captureMapPlayers(
        LOOT_SOURCE_BY_EVENT_SOURCE[loot.source],
        loots,
        game,
      ),
      accountId: hero.accountId,
      characterId: hero.characterId,
    };

    logLootCreateDebug("request-prepared", {
      ...debugContext,
      payload,
    });

    this.submit(payload, debugContext, "loot", acceptance.key);
  }

  private submit(
    payload: Parameters<typeof createLoot>[0],
    debugContext: LootCreateDebugContext,
    label: "loot" | "dialog loot",
    acceptanceKey: LootAcceptanceKey | undefined,
  ): void {
    createLoot(payload, debugContext)
      .then((response) => {
        useLootStore.getState().setLastLootId(response.id);
        reportSubmissionOutcome("loot", "logged");
        logLootCreateDebug("completed", {
          ...debugContext,
          lastLootId: response.id,
          response,
        });
      })
      .catch((error) => {
        const refusedBySettings =
          getApiErrorStringField(error, "code") ===
          NO_LOOTLOG_ACCEPTS_LOOT_CODE;

        if (acceptanceKey && refusedBySettings) {
          this.rejectedLoots.remember(acceptanceKey);
        }

        if (!refusedBySettings) reportSubmissionOutcome("loot", "failed");

        logLootCreateDebug("failed", {
          ...debugContext,
          error,
        });
        console.warn(`[LootEventProcessor] Failed to create ${label}:`, error);
      });
  }

  private resolveAcceptance(
    npcs: readonly Npc[],
    loots: ReturnType<typeof getLoot>,
    game: RuntimeGameSnapshot,
    debugContext: LootCreateDebugContext,
  ): { rejected: true } | { rejected: false; key?: LootAcceptanceKey } {
    const skip = (reason: string) => {
      logLootCreateDebug("skipped", { ...debugContext, reason });

      return { rejected: true } as const;
    };

    if (!npcs.some((npc) => npc.wt >= MIN_LOOT_NPC_WT)) {
      return skip("npc-wt-too-low");
    }

    const catchingGuildIds = getFreshCharacterCatchingGuildIds(
      game.hero.accountId,
      game.hero.characterId,
    );

    if (catchingGuildIds === undefined) return { rejected: false };

    if (resolveLootAcceptance({ catchingGuildIds }).accepted.length === 0) {
      return skip("no-catching-organization");
    }

    const npcTypes = new Set(npcs.map((npc) => getNpcType(NpcType, npc)));

    const key: LootAcceptanceKey = {
      scope: `${catchingGuildIds.toSorted().join(",")}|${[...npcTypes].toSorted().join(",")}`,
      rarities: loots.map((item) => itemStatValue(item.stat, "rarity") ?? ""),
    };

    return this.rejectedLoots.covers(key)
      ? skip("recently-rejected-by-lootlog-settings")
      : { rejected: false, key };
  }

  private captureMapPlayers(
    source: string,
    loots: ReturnType<typeof getLoot>,
    game: RuntimeGameSnapshot,
  ) {
    if (
      !capturesMapPlayers({
        source,
        rarities: loots.map((item) =>
          itemStatValue(item.stat ?? "", "rarity")?.toUpperCase(),
        ),
      })
    )
      return {};

    const others = useOthersStore.getState();
    const currentGame = useGameStore.getState();

    if (
      others.status !== "ready" ||
      currentGame.status !== "ready" ||
      currentGame.game !== game ||
      others.mapEpoch !== currentGame.mapEpoch
    )
      return {};

    const mapPlayersSnapshot: CreateLootDtoMapPlayersSnapshotItem[] = [];
    const seen = new Set<number>();

    for (const character of [game.hero, ...Object.values(others.othersById)]) {
      const accountId = Number(character.accountId);
      const characterId = Number(character.characterId);

      if (
        !Number.isSafeInteger(accountId) ||
        accountId <= 0 ||
        !Number.isSafeInteger(characterId) ||
        characterId <= 0 ||
        !character.name.trim()
      )
        return {};

      if (seen.has(characterId)) continue;
      seen.add(characterId);
      mapPlayersSnapshot.push({
        accountId,
        characterId,
        name: character.name,
        prof: getProfByShortname(character.profession) ?? null,
        icon: character.icon || null,
        lvl: character.level > 0 ? character.level : null,
      });
    }

    return { mapPlayersSnapshot };
  }

  private createLootFromDialog(
    event: GameEvent,
    {
      debugContext,
      eventNpcDelIds,
      game,
      npcData,
      resolutionSource,
    }: {
      debugContext: LootCreateDebugContext;
      eventNpcDelIds: number[];
      game: RuntimeGameSnapshot;
      npcData: RuntimeNpc;
      resolutionSource: DialogNpcContextSource;
    },
  ): void {
    const loot = event.loot;

    if (!loot) return;

    const loots = getLoot(event.item, loot);

    if (!loots.length) {
      logLootCreateDebug("skipped", {
        ...debugContext,
        eventNpcDelIds,
        npcId: npcData.id,
        reason: "empty-parsed-loots",
        resolutionSource,
      });

      return;
    }

    const mapName = game.map.name;

    const npcs: Npc[] = [
      {
        icon: npcData.icon,
        id: npcData.templateId ?? npcData.id,
        runtimeId: npcData.id,
        templateId: npcData.templateId,
        name: npcData.name,
        prof: npcData.profession,
        hpp: 0,
        type: npcData.type,
        isHeroFromEvent: npcData.isHeroFromEvent,
        wt: npcData.weight,
        lvl: resolveDialogLootNpcLevel({
          npcName: npcData.name,
          npcLevel: npcData.level,
        }),
        location: mapName,
        mapId: game.map.id,
        x: npcData.x,
        y: npcData.y,
      },
    ];

    const acceptance = this.resolveAcceptance(npcs, loots, game, debugContext);

    if (acceptance.rejected) {
      useDialogStore.getState().clearNpcContext();

      return;
    }

    const { hero, gameVersion } = game;

    if (gameVersion === null) {
      useDialogStore.getState().clearNpcContext();
      logLootCreateDebug("skipped", {
        ...debugContext,
        npcId: npcData.id,
        reason: "unknown-game-version",
        resolutionSource,
      });

      return;
    }

    const players: PartyMember[] = [
      {
        id: Number(hero.characterId),
        name: hero.name,
        icon: hero.icon,
        prof: hero.profession,
        hpp: Math.floor((hero.currentHp / hero.maxHp) * 100),
        lvl: hero.level,
        accountId: Number(hero.accountId),
      },
    ];

    const payload = {
      world: game.world,
      gameVersion,
      source: LOOT_SOURCE_BY_EVENT_SOURCE[loot.source],
      location: mapName,
      loots,
      npcs,
      players,
      accountId: hero.accountId,
      characterId: hero.characterId,
    };

    logLootCreateDebug("request-prepared", {
      ...debugContext,
      eventNpcDelIds,
      payload,
      resolutionSource,
    });

    useDialogStore.getState().clearNpcContext();
    this.submit(payload, debugContext, "dialog loot", acceptance.key);
  }
}
