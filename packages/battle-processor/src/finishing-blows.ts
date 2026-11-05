import { parseBattleMoves, type BattleEvent } from "./battle-log.js";

export type FinishingBlow = {
  killerId: string;
  victimId: string;
  /** The index of the row that dealt the blow among the battle's rows. */
  moveIndex: number;
};

/**
 * The warriors who dealt each death of an opponent, in battle order. A row
 * reports both warriors' HP after it, so a target that falls in a row died to
 * its actor, and an actor that falls in a row with a target died to that
 * target's counter or reflected damage. A row without a target is a damage
 * over time tick; the log does not name its source, so the death goes to the
 * last opponent that acted on the victim. A revived warrior can die again.
 */
export function findFinishingBlows(
  events: readonly BattleEvent[],
): FinishingBlow[] {
  const teams = new Map<string, number>();

  for (const event of events) {
    for (const [id, warrior] of Object.entries(event.f?.w ?? {})) {
      teams.set(id, warrior.team);
    }
  }

  const isOpponent = (left: string, right: string) => {
    const leftTeam = teams.get(left);
    const rightTeam = teams.get(right);

    return (
      leftTeam !== undefined &&
      rightTeam !== undefined &&
      leftTeam !== rightTeam
    );
  };

  const dead = new Set<string>();
  const lastOpponentActor = new Map<string, string>();
  const blows: FinishingBlow[] = [];

  const observeHp = (
    moveIndex: number,
    victimId: string,
    hp: number | null,
    killerId: string | undefined,
  ) => {
    if (hp === null || Number.isNaN(hp)) return;

    if (hp > 0) {
      dead.delete(victimId);

      return;
    }

    if (dead.has(victimId)) return;
    dead.add(victimId);

    if (killerId && isOpponent(killerId, victimId)) {
      blows.push({ killerId, victimId, moveIndex });
    }
  };

  for (const [moveIndex, move] of parseBattleMoves(events).entries()) {
    const { attackerId, defenderId } = move;

    if (attackerId && defenderId && isOpponent(attackerId, defenderId)) {
      lastOpponentActor.set(defenderId, attackerId);
    }

    if (defenderId) {
      observeHp(
        moveIndex,
        defenderId,
        move.defenderHpPercentage,
        attackerId ?? undefined,
      );
    }

    if (attackerId) {
      observeHp(
        moveIndex,
        attackerId,
        move.attackerHpPercentage,
        defenderId ?? lastOpponentActor.get(attackerId),
      );
    }
  }

  return blows;
}
