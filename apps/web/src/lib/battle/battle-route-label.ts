import { z } from "zod";
import type { TOptions } from "i18next";
import type { Battle } from "@/lib/api/battlelog-types";

type Translate = (key: string, options?: TOptions) => string;

export type BattleRouteLabelMatch = {
  loaderData?: unknown;
  params?: Record<string, string | undefined>;
};

const battleLabel = z.object({
  id: z.string(),
  type: z.string(),
  warriors: z.array(z.object({ name: z.string(), team: z.number() })),
});
type BattleLabel = z.output<typeof battleLabel>;
const battleRouteLoaderData = z.object({ battle: battleLabel.optional() });

type BattleRouteLabelOptions = {
  currentBattle?: Battle;
};

function getOneVsOneBattleLabel(battle: BattleLabel | undefined, t: Translate) {
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

function getRouteBattle(
  match: BattleRouteLabelMatch | undefined,
  options: BattleRouteLabelOptions,
) {
  const battleId = match?.params?.battleId;

  if (!battleId) {
    return;
  }

  const loaderBattle = battleRouteLoaderData.safeParse(match?.loaderData).data
    ?.battle;

  if (loaderBattle?.id === battleId) {
    return loaderBattle;
  }

  if (options.currentBattle?.id === battleId) {
    return options.currentBattle;
  }
}

export function getBattleRouteLabel(
  match: BattleRouteLabelMatch | undefined,
  t: Translate,
  options: BattleRouteLabelOptions = {},
) {
  const battleId = match?.params?.battleId;

  if (!battleId) {
    return;
  }

  return (
    getOneVsOneBattleLabel(getRouteBattle(match, options), t) ??
    t("battlePanel.navigation.battleFallback", { id: battleId })
  );
}
