import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { LOOTLOG_APP_URL } from "@/config/app";
import { getNpcTypeByWt } from "@lootlog/types";
import { NpcType } from "@/hooks/api/use-npcs";
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

const TRACKABLE_NPC_TYPES = new Set([
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.COLOSSUS,
  NpcType.TITAN,
]);

const showBattleCreatedToast = (battleId: number) => {
  const battleUrl = `${LOOTLOG_APP_URL}/@me/battle-panel/battles/${battleId}`;

  toast("Walka została dodana", {
    duration: 10000,
    action: {
      label: "Kopiuj link",
      onClick: () => {
        navigator.clipboard.writeText(battleUrl);
        toast.success("Link skopiowany do schowka");
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

const extractDeadNpcs = (warriors: BattleWarriorsWithAccountId) => {
  const deadNpcs: Array<{
    id: number;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    wt: number;
    type: number;
  }> = [];

  for (const [key, warrior] of Object.entries(warriors)) {
    if (key.startsWith("-") && isWarriorDead(warrior)) {
      deadNpcs.push({
        id: Number.parseInt(key, 10),
        name: warrior.name,
        lvl: warrior.lvl,
        prof: warrior.prof || "",
        icon: warrior.icon,
        wt: warrior.wt,
        type: warrior.type,
      });
    }
  }

  return deadNpcs;
};

export class BattleEventProcessor {
  private observedTeams = new Set<number>();
  private hasMultipleTeams = false;

  async handle(event: GameEvent): Promise<void> {
    if (!event.f) return;

    const accountId = Game.hero.account;
    const characterId = Game.hero.id;
    const world = Game.getWorldName();

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
      const hasNpcInBattle = Object.keys(battleWarriors).some((key) =>
        key.startsWith("-"),
      );

      // Kill tracking — always runs regardless of isBattleCollectionEnabled
      if (hasNpcInBattle) {
        const deadNpcs = extractDeadNpcs(battleWarriors);

        if (deadNpcs.length > 0) {
          const sortedByWt = [...deadNpcs].sort((a, b) => b.wt - a.wt);
          const topNpc = sortedByWt[0];

          if (topNpc) {
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
                const { type: _, ...npcWithoutType } = topNpc;
                createKill({
                  world,
                  npc: npcWithoutType,
                  characterId: String(characterId),
                  accountId: String(accountId),
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
        }
      }

      // Battle logging — only if enabled
      if (battlePanelStore.isBattleCollectionEnabled) {
        const battleTurns = useBattleStore
          .getState()
          .events.reduce((acc: string[], curr) => {
            if (!curr.f || !curr.f.m) return acc;

            return [...acc, ...curr.f.m];
          }, []);

        const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));
        const lastBattleHash = useBattleStore.getState().lastBattleHash;

        if (lastBattleHash !== battleHash) {
          const events = mapBattleEventsToPayload(
            useBattleStore.getState().events,
          );

          // Use incremental hasMultipleTeams flag instead of O(N*M) loop
          if (events && !hasNpcInBattle && this.hasMultipleTeams) {
            createBattle({
              accountId: String(accountId),
              characterId: String(characterId),
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
