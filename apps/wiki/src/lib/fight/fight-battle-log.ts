import type {
  BattlePayload,
  BattleWarriorSnapshot,
} from "@lootlog/battle-processor/battle-log";
import type { FightEvent, FightResult, FightSetup } from "./fight-simulator";
import type { Combatant, Profession } from "./fight-state";

const RANGED: ReadonlySet<Profession> = new Set(["h", "t"]);

export const SIMULATED_CHARACTER_ID = "1";

const ELEMENT_KEYS = [
  ["dmgf", "fire"],
  ["dmgc", "frost"],
  ["dmgl", "light"],
] as const;

const physicalKey = (combatant: Combatant) =>
  RANGED.has(combatant.profession) ? "dmgd" : "dmg";

type Strike = Extract<FightEvent, { kind: "strike" }>;

type Skill = Extract<FightEvent, { kind: "skill" }>;

type DamageOverTime = Extract<FightEvent, { kind: "damageOverTime" }>;

const damageKeys = (event: Strike, attacker: Combatant) =>
  (
    [
      [physicalKey(attacker), "physical"],
      ...ELEMENT_KEYS,
      ["dmgo", "offhand"],
    ] as const
  ).filter(([, part]) => event.strength[part] > 0);

const percentOf = (hp: number, maxHp: number) =>
  ((100 * hp) / maxHp).toFixed(2);

export const fightBattlePayload = (
  setup: FightSetup,
  events: readonly FightEvent[],
  result: FightResult,
): BattlePayload => {
  const fighters = setup.teams.flatMap((team, teamIndex) =>
    team.map((combatant) => ({ combatant, team: teamIndex + 1 })),
  );

  const maxHpOf = (index: number) => fighters[index]?.combatant.hp ?? 1;

  const nameOf = (index: number) => fighters[index]?.combatant.name ?? "";

  const side = (index: number, hp: number) =>
    `${index + 1}=${percentOf(hp, maxHpOf(index))}`;

  const sideAt = (index: number, hp: readonly number[]) =>
    side(index, hp[index] ?? 0);

  const lastHeal = (amount: number, index: number, hp: readonly number[]) =>
    amount > 0
      ? [
          `legbon_lastheal=${amount},${nameOf(index)}(${percentOf(hp[index] ?? 0, maxHpOf(index))}%)`,
        ]
      : [];

  const reduced = (value: number, reduction: number) =>
    reduction > 0 ? `${value},${reduction}` : `${value}`;

  const damageOverTimeRows = (event: DamageOverTime) => {
    const ticks = [
      ...(event.poison > 0
        ? [
            {
              damage: event.poison,
              action: `poison=${reduced(event.poison, event.poisonReduction)}`,
            },
          ]
        : []),
      ...(event.wound > 0
        ? [
            {
              damage: event.wound,
              action: `wound=${reduced(event.wound, event.woundReduction)}`,
            },
          ]
        : []),
      ...(event.anguish > 0
        ? [{ damage: event.anguish, action: `anguish=${event.anguish}` }]
        : []),
    ];

    const healTag = lastHeal(event.lastHeal, event.actor, event.hp);
    const finalHp = event.hp[event.actor] ?? 0;

    if (ticks.length === 0) {
      return [[side(event.actor, finalHp), "0", ...healTag].join(";")];
    }

    let hp =
      finalHp -
      event.lastHeal +
      ticks.reduce((total, tick) => total + tick.damage, 0);

    return ticks.map((tick, index) => {
      const isLast = index === ticks.length - 1;

      hp -= tick.damage;

      return [
        side(event.actor, isLast ? finalHp : Math.max(0, hp)),
        "0",
        ...(isLast ? healTag : []),
        tick.action,
      ].join(";");
    });
  };

  const skillActions = (event: Skill) => [
    `tspell=${event.skill.name}`,
    `skillId=${event.skill.id}`,
    ...event.skill.logged.map(([key, value]) =>
      key === "achpp_per"
        ? `${key}=${event.armorBonus}`
        : value === null
          ? key
          : `${key}=${value}`,
    ),
    ...(event.manaRestored > 0 ? [`mana=-${event.manaRestored}`] : []),
    ...(event.energyRestored > 0 ? [`energy=-${event.energyRestored}`] : []),
    ...lastHeal(event.lastHeal, event.target, event.hp),
    ...(event.comboDamage > 0
      ? [
          `+oth_dmg=${event.comboDamage},a,${nameOf(event.target)}(${percentOf(event.hp[event.target] ?? 0, maxHpOf(event.target))}%)`,
        ]
      : []),
    ...(event.comboSpent > 0 ? [`combo-max=${event.comboSpent}`] : []),
  ];

  const strikeActions = (event: Strike, attacker: Combatant) => {
    const damage = damageKeys(event, attacker);

    return [
      ...(event.crit ? ["+crit"] : []),
      ...(event.veryCrit ? ["+legbon_verycrit"] : []),
      ...(event.pierced ? ["+pierce"] : []),
      ...(event.fastArrow ? ["+fastarrow"] : []),
      ...damage.map(([key, part]) => `+${key}=${event.strength[part]}`),
      ...(event.glare ? ["-legbon_glare"] : []),
      ...(event.curse ? ["+legbon_curse"] : []),
      ...(event.armorDestroyed > 0
        ? [`+acdmg=${Math.round(event.armorDestroyed)}`]
        : []),
      ...(event.evaded ? ["-evade"] : []),
      ...(event.blocked > 0 ? [`-blok=${event.blocked}`] : []),
      ...(event.pierceBlocked ? ["-pierceb"] : []),
      ...(event.wounded ? ["+wound"] : []),
      ...(event.anguish ? ["+legbon_anguish"] : []),
      ...(event.holyTouch ? ["+legbon_holytouch"] : []),
      ...(event.puncture > 0 ? [`+legbon_puncture=${event.puncture}`] : []),
      ...(event.critred > 0 ? [`-legbon_critred=${event.critred}`] : []),
      ...(event.facade > 0 ? [`-legbon_facade=${event.facade}`] : []),
      ...(event.cleansed ? ["-legbon_cleanse"] : []),
      ...lastHeal(event.lastHeal, event.target, event.hp),
      ...damage.map(([key, part]) => `-${key}=${event.damage[part]}`),
    ];
  };

  const rows = events.flatMap((event): string[] => {
    switch (event.kind) {
      case "lostTurn":
        return [`0;0;txt=${nameOf(event.actor)} - utrata tury`];
      case "damageOverTime":
        return damageOverTimeRows(event);
      case "holyTouchHeal":
        return [
          `${sideAt(event.actor, event.hp)};0;legbon_holytouch_heal=${event.amount}`,
        ];
      case "heal":
        return [`${sideAt(event.actor, event.hp)};0;heal=${event.amount}`];
      case "skill":
        return [
          [
            sideAt(event.actor, event.hp),
            sideAt(event.target, event.hp),
            ...skillActions(event),
          ].join(";"),
        ];
      case "strike": {
        const attacker = fighters[event.actor]?.combatant;

        return attacker
          ? [
              [
                sideAt(event.actor, event.hp),
                sideAt(event.target, event.hp),
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
      .join(", ");

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
