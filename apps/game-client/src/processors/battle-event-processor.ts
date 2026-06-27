import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { LOOTLOG_APP_URL } from "@/config/app";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/api/npcs.api";
import { addAccountIdsToWarriors } from "@/hooks/game-events/helpers/battle.helpers";
import { Game } from "@/lib/game";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import {
  useBattleStore,
  type BattleWarriorsWithAccountId,
} from "@/store/game-store/battle.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createKill, createBattle } from "@/api";
import { toast } from "sonner";
import { getFixedT } from "@/i18n/get-fixed-t";

const TRACKABLE_NPC_TYPES = new Set([
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);

const showBattleCreatedToast = (battleId: string) => {
  const t = getFixedT("timers");
  const battleUrl = `${LOOTLOG_APP_URL}/@me/battle-panel/battles/${battleId}`;

  toast(t("messages.battleLinkCreated"), {
    duration: 10000,
    action: {
      label: t("messages.copyBattleLink"),
      onClick: () => {
        navigator.clipboard.writeText(battleUrl);
        toast.success(t("messages.battleLinkCopied"));
      },
    },
  });
};

const parseNumericValue = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
};

const isWarriorDead = (warrior: BattleWarriorsWithAccountId[string]) => {
  const legacyHpp = parseNumericValue((warrior as { hpp?: unknown }).hpp);
  if (legacyHpp !== null) return legacyHpp <= 0;

  const hpData = (warrior as { hp?: { hpp?: unknown; cur?: unknown } }).hp;
  const nestedHpp = parseNumericValue(hpData?.hpp);
  if (nestedHpp !== null) return nestedHpp <= 0;

  const currentHp = parseNumericValue(hpData?.cur);
  if (currentHp !== null) return currentHp <= 0;

  return false;
};

type DeadNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  type: number;
};

const getNpcBattleSummary = (warriors: BattleWarriorsWithAccountId) => {
  const deadNpcs: Array<{
    id: number;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    wt: number;
    type: number;
  }> = [];
  let hasNpcInBattle = false;
  let topNpc: DeadNpc | null = null;

  for (const [key, warrior] of Object.entries(warriors)) {
    if (!key.startsWith("-")) {
      continue;
    }

    hasNpcInBattle = true;

    if (!isWarriorDead(warrior)) {
      continue;
    }

    const deadNpc = {
      id: Number.parseInt(key, 10),
      name: warrior.name,
      lvl: warrior.lvl,
      prof: warrior.prof || "",
      icon: warrior.icon,
      wt: warrior.wt,
      type: warrior.type,
    };

    deadNpcs.push(deadNpc);

    if (!topNpc || deadNpc.wt > topNpc.wt) {
      topNpc = deadNpc;
    }
  }

  return {
    deadNpcs,
    hasNpcInBattle,
    topNpc,
  };
};

export class BattleEventProcessor {
  private observedTeams = new Set<number>();
  private hasMultipleTeams = false;

  async handle(event: GameEvent): Promise<void> {
    if (!event.f) return;

    const battlePanelStore = useBattlePanelStore.getState();
    const battleStore = useBattleStore.getState();

    if (event.f.init === "1") {
      battleStore.clearEvents();
      battleStore.setBattleState("in-battle");
      battleStore.updateBattleWarriors(null);
      this.observedTeams.clear();
      this.hasMultipleTeams = false;
    }

    if (event.f.w) {
      const previousBattleWarriors = useBattleStore.getState().battleWarriors;
      const battleWarriorsWithAccountId = addAccountIdsToWarriors(
        event.f.w,
        previousBattleWarriors,
      );
      battleStore.updateBattleWarriors(battleWarriorsWithAccountId);

      // Incremental team detection — O(1) amortized instead of O(N*M)
      if (!this.hasMultipleTeams) {
        for (const warrior of Object.values(event.f.w)) {
          if (warrior.team !== undefined) {
            this.observedTeams.add(warrior.team);
            if (this.observedTeams.size > 1) {
              this.hasMultipleTeams = true;
              break;
            }
          }
        }
      }
    }

    if (battlePanelStore.isBattleCollectionEnabled) {
      battleStore.addEvent(event);
    }

    if (
      event.f.endBattle === 1 &&
      useBattleStore.getState().battleState === "in-battle"
    ) {
      const battleWarriors = useBattleStore.getState().battleWarriors;
      const { deadNpcs, hasNpcInBattle, topNpc } =
        getNpcBattleSummary(battleWarriors);

      // Kill tracking — always runs regardless of isBattleCollectionEnabled
      if (hasNpcInBattle && topNpc) {
        const npcType = getNpcTypeByWt(
          NpcType,
          topNpc.wt,
          topNpc.prof,
          topNpc.type,
        );

        if (TRACKABLE_NPC_TYPES.has(npcType)) {
          // Kill hash includes timestamp to prevent ignoring repeat kills of same respawned monster
          const killHash = await createSHA256Hash(
            JSON.stringify({
              ids: deadNpcs.map((npc) => npc.id).sort(),
              ts: Date.now(),
            }),
          );
          const lastKillHash = useBattleStore.getState().lastKillHash;

          if (killHash !== lastKillHash) {
            const hero = Game.hero;
            const { type: _, ...npcWithoutType } = topNpc;
            createKill({
              world: Game.getWorldName(),
              npc: npcWithoutType,
              characterId: String(hero.id),
              accountId: String(hero.account),
            }).catch((error) => {
              console.warn(
                "[BattleEventProcessor] Failed to create kill:",
                error,
              );
            });
            battleStore.setLastKillHash(killHash);
          }
        }
      }

      // Battle logging — only if enabled
      if (battlePanelStore.isBattleCollectionEnabled) {
        const storedEvents = useBattleStore.getState().events;
        const battleTurns: string[] = [];

        for (const storedEvent of storedEvents) {
          if (storedEvent.f?.m) {
            battleTurns.push(...storedEvent.f.m);
          }
        }

        const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));
        const lastBattleHash = useBattleStore.getState().lastBattleHash;

        if (lastBattleHash !== battleHash) {
          const events = mapBattleEventsToPayload(storedEvents);

          // Use incremental hasMultipleTeams flag instead of O(N*M) loop
          if (events && !hasNpcInBattle && this.hasMultipleTeams) {
            const hero = Game.hero;
            const accountId = String(hero.account);
            const characterId = String(hero.id);
            const world = Game.getWorldName();
            const submissionId = await createSHA256Hash(
              JSON.stringify({
                accountId,
                characterId,
                events,
                world,
              }),
            );

            createBattle({
              accountId,
              characterId,
              submissionId,
              world,
              events,
            })
              .then((response) => {
                showBattleCreatedToast(response.battleId);
              })
              .catch((error) => {
                console.warn(
                  "[BattleEventProcessor] Failed to create battle:",
                  error,
                );
              });
          }
        }

        battleStore.setLastBattleHash(battleHash);
      }

      battleStore.clearEvents();
      battleStore.setBattleState("idle");
    }
  }
}
