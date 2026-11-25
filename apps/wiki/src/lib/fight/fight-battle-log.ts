import type {
  BattlePayload,
  BattleWarriorSnapshot,
} from "@lootlog/battle-processor/battle-log";
import type { FightEvent, FightResult, FightSetup } from "./fight-simulator";
import type { Combatant, Profession } from "./fight-state";

const RANGED: ReadonlySet<Profession> = new Set(["h", "t"]);

export const SIMULATED_CHARACTER_ID = "1";

const ELEMENT_KEYS = [
  ["fire", "dmgf"],
  ["frost", "dmgc"],
  ["light", "dmgl"],
] as const;

const physicalKey = (combatant: Combatant) =>
  RANGED.has(combatant.profession) ? "dmgd" : "dmg";

type Strike = Extract<FightEvent, { kind: "strike" }>;

const damageEntries = (event: Strike, attacker: Combatant) => {
  const entries: (readonly [string, number])[] = [
    [physicalKey(attacker), event.damage.physical],
    ...ELEMENT_KEYS.map(
      ([element, key]) => [key, event.damage[element]] as const,
    ),
    ["dmgo", event.damage.offhand],
  ];

  const dealt = entries.filter(([, value]) => value > 0);

  return dealt.length > 0 ? dealt : [[physicalKey(attacker), 0] as const];
};

const strikeActions = (event: Strike, attacker: Combatant) => {
  const damage = damageEntries(event, attacker);

  return [
    ...(event.crit ? ["+crit"] : []),
    ...(event.veryCrit ? ["+legbon_verycrit"] : []),
    ...(event.puncture > 0 ? [`+legbon_puncture=${event.puncture}`] : []),
    ...(event.pierced ? ["+pierce"] : []),
    ...(event.fastArrow ? ["+fastarrow"] : []),
    ...damage.map(([key, value]) => `+${key}=${value}`),
    ...(event.wounded ? ["+wound"] : []),
    ...(event.curse ? ["+legbon_curse"] : []),
    ...(event.anguish ? ["+legbon_anguish"] : []),
    ...(event.holyTouch ? ["+legbon_holytouch"] : []),
    ...(event.armorDestroyed > 0
      ? [`+acdmg=${Math.round(event.armorDestroyed)}`]
      : []),
    ...(event.evaded ? ["-evade"] : []),
    ...(event.pierceBlocked ? ["-pierceb"] : []),
    ...(event.blocked > 0 ? [`-blok=${event.blocked}`] : []),
    ...(event.glare ? ["-legbon_glare"] : []),
    ...(event.cleansed ? ["-legbon_cleanse"] : []),
    ...(event.critred > 0 ? [`-legbon_critred=${event.critred}`] : []),
    ...(event.facade > 0 ? [`-legbon_facade=${event.facade}`] : []),
    ...damage.map(([key, value]) => `-${key}=${value}`),
  ];
};

export const fightBattlePayload = (
  setup: FightSetup,
  events: readonly FightEvent[],
  result: FightResult,
): BattlePayload => {
  const fighters = setup.teams.flatMap((team, teamIndex) =>
    team.map((combatant) => ({ combatant, team: teamIndex + 1 })),
  );

  const side = (index: number, hp: readonly number[]) => {
    const maxHp = fighters[index]?.combatant.hp ?? 1;

    return `${index + 1}=${((100 * (hp[index] ?? 0)) / maxHp).toFixed(2)}`;
  };

  const nameOf = (index: number) => fighters[index]?.combatant.name ?? "";

  const rows = events.flatMap((event): string[] => {
    if (event.kind === "lostTurn") {
      return [`0;0;txt=${nameOf(event.actor)} - utrata tury`];
    }

    const actor = side(event.actor, event.hp);

    switch (event.kind) {
      case "damageOverTime":
        return [
          ...(event.poison > 0 ? [`${actor};0;poison=${event.poison}`] : []),
          ...(event.wound > 0 ? [`${actor};0;wound=${event.wound}`] : []),
          ...(event.anguish > 0 ? [`${actor};0;anguish=${event.anguish}`] : []),
        ];
      case "bonusHeal":
        return [
          event.bonus === "holytouch"
            ? `${actor};0;legbon_holytouch_heal=${event.amount}`
            : `${actor};0;legbon_lastheal=${event.amount},${nameOf(event.actor)}`,
        ];
      case "heal":
        return [`${actor};0;heal=${event.amount}`];
      case "skill":
        return [
          `${actor};${side(event.target, event.hp)};tspell=${event.skill.name};skillId=${event.skill.id}`,
        ];
      case "strike": {
        const attacker = fighters[event.actor]?.combatant;

        return attacker
          ? [
              [
                actor,
                side(event.target, event.hp),
                ...strikeActions(event, attacker),
              ].join(";"),
            ]
          : [];
      }
    }
  });

  const namesOf = (team: number) =>
    fighters
      .filter((fighter) => fighter.team === team + 1)
      .map((fighter) => fighter.combatant.name)
      .join(",");

  const outcome =
    result.winner === null
      ? ["0;0;winner=?"]
      : [
          `0;0;winner=${namesOf(result.winner)}`,
          ...setup.teams.flatMap((_, team) =>
            team === result.winner ? [] : [`0;0;loser=${namesOf(team)}`],
          ),
        ];

  const warriors: Record<string, BattleWarriorSnapshot> = Object.fromEntries(
    fighters.map(({ combatant, team }, index) => [
      String(index + 1),
      {
        originalId: index + 1,
        name: combatant.name,
        lvl: combatant.level,
        prof: combatant.profession,
        icon: "",
        team,
      },
    ]),
  );

  return {
    accountId: "simulation",
    characterId: SIMULATED_CHARACTER_ID,
    world: "simulation",
    events: [
      { ev: 0, f: { w: warriors, m: [...rows, ...outcome], endBattle: 1 } },
    ],
  };
};
