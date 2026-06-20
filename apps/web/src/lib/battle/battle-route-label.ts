import type { Battle } from "@/lib/api/battlelog-types";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type BattleRouteLabelMatch = {
  loaderData?: unknown;
  params?: Record<string, string | undefined>;
};

type BattleRouteLoaderData = {
  battle?: Battle;
};

function getBattleFromLoaderData(loaderData: unknown) {
  if (!loaderData || typeof loaderData !== "object") {
    return;
  }

  return (loaderData as BattleRouteLoaderData).battle;
}

function getOneVsOneBattleLabel(battle: Battle | undefined, t: Translate) {
  if (!battle || battle.type !== "1v1" || !Array.isArray(battle.warriors)) {
    return;
  }

  const teamOneWarriors = battle.warriors.filter(
    (warrior) => warrior.team === 1,
  );
  const teamTwoWarriors = battle.warriors.filter(
    (warrior) => warrior.team === 2,
  );
  const teamOneWarrior = teamOneWarriors[0];
  const teamTwoWarrior = teamTwoWarriors[0];

  if (
    teamOneWarriors.length !== 1 ||
    teamTwoWarriors.length !== 1 ||
    !teamOneWarrior ||
    !teamTwoWarrior
  ) {
    return;
  }

  return t("battlePanel.navigation.battleDuel", {
    first: teamOneWarrior.name,
    second: teamTwoWarrior.name,
  });
}

export function getBattleRouteLabel(
  match: BattleRouteLabelMatch | undefined,
  t: Translate,
) {
  const battleId = match?.params?.battleId;

  if (!battleId) {
    return;
  }

  return (
    getOneVsOneBattleLabel(getBattleFromLoaderData(match?.loaderData), t) ??
    t("battlePanel.navigation.battleFallback", { id: battleId })
  );
}
