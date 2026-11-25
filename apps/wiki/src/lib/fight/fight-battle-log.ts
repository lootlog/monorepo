import type {
  BattlePayload,
  BattleWarriorSnapshot,
} from "@lootlog/battle-processor/battle-log";
import type { FightEvent, FightResult, FightSetup } from "./fight-events";
import { crushKey } from "./fight-passives";
import { withAllyHealth, type Combatant, type Profession } from "./fight-state";

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

const dealtDamageKeys = (event: Strike, attacker: Combatant) =>
  (
    [
      [physicalKey(attacker), "physical"],
      ["dmgo", "offhand"],
      ["thirdatt", "third"],
      ...ELEMENT_KEYS,
    ] as const
  ).filter(([, part]) => event.strength[part] > 0);

const takenDamageKeys = (event: Strike, attacker: Combatant) =>
  (
    [
      [physicalKey(attacker), "physical"],
      ...ELEMENT_KEYS,
      ["dmgo", "offhand"],
      ["thirdatt", "third"],
    ] as const
  ).filter(([, part]) => event.strength[part] > 0);

const percentOf = (hp: number, maxHp: number) =>
  ((100 * hp) / maxHp).toFixed(2);

type Entry = readonly [shown: boolean, entry: string];

const valued = (key: string, value: number): Entry => [
  value > 0,
  `${key}=${value}`,
];

const present = (entries: readonly Entry[]) =>
  entries.flatMap(([shown, entry]) => (shown ? [entry] : []));

const AURA_KEYS = [
  [
    "poison_lowdmg_per-enemies",
    (combatant: Combatant) => combatant.passives.poisonWeakening,
  ],
  [
    "heal_per-enemies",
    (combatant: Combatant) => -combatant.passives.enemyHealing,
  ],
  ["heal_per-allies", (combatant: Combatant) => combatant.passives.allyHealing],
  ["hp_per-allies", (combatant: Combatant) => combatant.passives.allyHealth],
] as const;

const drained = (
  key: string,
  { amount, reduced }: { amount: number; reduced: number },
): Entry => [
  amount > 0,
  reduced > 0 ? `${key}=${amount},${reduced}` : `${key}=${amount}`,
];

export type FightLogRow = {
  readonly event: number | null;
  readonly at: number;
};

type FightBattleLog = {
  readonly payload: BattlePayload;
  readonly rows: readonly FightLogRow[];
};

export const fightBattleLog = (
  setup: FightSetup,
  events: readonly FightEvent[],
  result: FightResult,
): FightBattleLog => {
  const fighters = withAllyHealth(setup.teams).flatMap((team, teamIndex) =>
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
    const healTag = lastHeal(event.lastHeal, event.actor, event.hp);
    const finalHp = event.hp[event.actor] ?? 0;

    if (event.ticks.length === 0) {
      return [[side(event.actor, finalHp), "0", ...healTag].join(";")];
    }

    let hp =
      finalHp -
      event.lastHeal +
      event.ticks.reduce((total, tick) => total + tick.damage, 0);

    return event.ticks.map((tick, index) => {
      const isLast = index === event.ticks.length - 1;

      hp -= tick.damage;

      return [
        side(event.actor, isLast ? finalHp : Math.max(0, hp)),
        "0",
        ...(isLast ? healTag : []),
        ...present([
          [event.immune, "-immunity_to_dmg"],
          valued("-poison_lowdmg_per", tick.poisonWeakening),
        ]),
        `${tick.kind}=${reduced(tick.damage, tick.reduction)}`,
      ].join(";");
    });
  };

  const otherDamage = (
    damage: number,
    flag: string,
    index: number,
    hp: readonly number[],
  ) =>
    `+oth_dmg=${damage},${flag},${nameOf(index)}(${percentOf(hp[index] ?? 0, maxHpOf(index))}%)`;

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
    ...present([
      [event.manaRestored > 0, `mana=-${event.manaRestored}`],
      [event.energyRestored > 0, `energy=-${event.energyRestored}`],
      valued("bandage", event.bandaged),
      valued("heal_target", event.healed),
      drained("+manadest", event.manaDestroyed),
      drained("+endest", event.energyDestroyed),
    ]),
    ...lastHeal(event.lastHeal, event.target, event.hp),
    ...present([
      [
        event.comboDamage + event.flatDamage > 0,
        otherDamage(
          event.comboDamage + event.flatDamage,
          "a",
          event.target,
          event.hp,
        ),
      ],
      valued("combo-max", event.comboSpent),
    ]),
    ...event.swings.flatMap((swing, index) => [
      ...lastHeal(event.swingLastHeals[index] ?? 0, swing.target, event.hp),
      otherDamage(swing.damage, "a", swing.target, event.hp),
    ]),
    ...present([valued("stealmana", event.manaStolen)]),
  ];

  const strikeActions = (event: Strike, attacker: Combatant) => {
    const { triggers } = event;

    return [
      ...present([
        valued("+rage", event.rage),
        [event.crit, "+crit"],
        [event.offhandCrit, "+of_crit"],
        [event.veryCrit, "+legbon_verycrit"],
        valued("+critslow_per", event.critSlow),
        [triggers.distracted, "+distract"],
        valued("+engback", triggers.energyBack),
        valued("+critsa", triggers.critSpeed),
        valued("+actdmg", triggers.poisonResistanceDestroyed),
        [event.swung, "+swing"],
      ]),
      ...event.swings.flatMap((swing, index) => [
        ...lastHeal(event.swingLastHeals[index] ?? 0, swing.target, event.hp),
        otherDamage(swing.damage, " ", swing.target, event.hp),
      ]),
      ...present([
        [event.pierceShown, "+pierce"],
        [event.fastArrow, "+fastarrow"],
        valued("+vulture", event.vulture),
        valued("-poison_lowdmg_per", event.poisonWeakened),
      ]),
      ...dealtDamageKeys(event, attacker).map(
        ([key, part]) => `+${key}=${event.strength[part]}`,
      ),
      ...present([
        [event.arrowBlocked, "-arrowblock"],
        [event.parried, "-parry"],
        valued("+critpoison_per", triggers.critPoison),
        [event.glare, "-legbon_glare"],
        [event.curse, "+legbon_curse"],
        valued("-redacdmg", event.armorDestructionResisted),
        [
          event.armorDestructionReduction > 0,
          `-redacdmg_per=-${event.armorDestructionReduction}`,
        ],
        valued("+acdmg", Math.round(event.armorDestroyed)),
        valued("+critpierce", triggers.critPierce),
        [event.armorBroken, "+acdmg_destroyed"],
        valued("+resdmg", event.resistanceDestroyed),
        valued("+lowheal2turns", event.enemyHealingCut),
        valued("-lowcritallval", event.critValueReduced),
        drained("-manadest", event.manaDrained),
        drained("-endest", event.energyDrained),
        valued("+energy", event.energyBurned),
        [event.evaded, "-evade"],
        valued("+abdest", event.absorbDestroyed),
        ...(event.absorbShareDestroyed.absorb +
          event.absorbShareDestroyed.absorbMagic >
        0
          ? ([
              [true, `+abdest_per=${event.absorbShareDestroyed.absorb}`],
              [true, `+abmdest_per=${event.absorbShareDestroyed.absorbMagic}`],
            ] as const)
          : []),
        [
          event.absorbDestructionReduction > 0,
          `-redabdest_per=${event.absorbDestructionReduction}`,
        ],
        [event.stun, "+stun"],
        valued("+absorb", event.absorbRenewed),
        valued("+absorbm", event.absorbMagicRenewed),
        valued("-blok", event.blocked),
        [event.pierceBlocked, "-pierceb"],
        [event.freeze, "+freeze"],
        valued("-absorb", event.absorbed),
        [event.wounds.main && event.wounds.halved, "+woundpoison=50"],
        valued("-absorbm", event.absorbedMagic),
        [event.wounds.main && !event.wounds.halved, "+wound"],
        [event.wounds.offhand && !event.wounds.halved, "+of_wound"],
        [event.wounds.offhand && event.wounds.halved, "+of_woundpoison=50"],
        [event.anguish, "+legbon_anguish"],
        [event.holyTouch, "+legbon_holytouch"],
        valued("+legbon_puncture", event.puncture),
        valued("-legbon_critred", event.critred),
        valued("-legbon_facade", event.facade),
        [triggers.critWound, "+critwound"],
        valued("+injure", triggers.injure),
        valued("+taken_dmg", event.takenBonus),
        [event.cleansed, "-legbon_cleanse"],
        valued(crushKey(attacker), event.crush),
        [event.vamp !== null, `vamp_time=${event.vamp}`],
      ]),
      ...lastHeal(event.lastHeal, event.target, event.hp),
      ...present([
        [event.immune, "-immunity_to_dmg"],
        [event.countered, "-contra"],
      ]),
      ...takenDamageKeys(event, attacker).map(
        ([key, part]) => `-${key}=${event.damage[part]}`,
      ),
      ...present([valued("-dmga", event.unavoidable)]),
      ...lastHeal(event.reflectLastHeal, event.actor, event.hp),
      ...present([
        [
          event.reflected > 0,
          otherDamage(event.reflected, "a", event.actor, event.hp),
        ],
      ]),
    ];
  };

  const auraRows = fighters.flatMap(({ combatant }, index) =>
    AURA_KEYS.flatMap(([key, valueOf]) => {
      const value = valueOf(combatant);

      return value === 0
        ? []
        : [`${side(index, combatant.hp)};0;${key}=${value}`];
    }),
  );

  const eventRows = events.map((event): string[] => {
    switch (event.kind) {
      case "step":
        return [`${sideAt(event.actor, event.hp)};0;step`];
      case "lostTurn":
        return [
          `0;0;txt=${nameOf(event.actor)} - utrata tury${event.stunReduction > 0 ? ` (redukcja ogłuszenia ${event.stunReduction}%)` : ""}`,
        ];
      case "damageOverTime":
        return damageOverTimeRows(event);
      case "energyRegen":
        return [`${sideAt(event.actor, event.hp)};0;en-regen=${event.amount}`];
      case "holyTouchHeal":
        return [
          `${sideAt(event.actor, event.hp)};0;legbon_holytouch_heal=${event.amount}`,
        ];
      case "heal":
        return [
          `${sideAt(event.actor, event.hp)};0;heal=${event.cut > 0 ? `${event.amount},-${event.cut}` : event.amount}`,
        ];
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

  const rows = [
    ...auraRows.map(() => ({ event: null, at: 0 })),
    ...eventRows.flatMap((lines, event) =>
      lines.map(() => ({ event, at: event })),
    ),
    ...outcome.map(() => ({ event: null, at: events.length })),
  ];

  return {
    payload: {
      accountId: "simulation",
      characterId: SIMULATED_CHARACTER_ID,
      world: "simulation",
      events: [
        {
          ev: 0,
          f: {
            w: warriors,
            m: [...auraRows, ...eventRows.flat(), ...outcome],
            endBattle: 1,
          },
        },
      ],
    },
    rows,
  };
};
