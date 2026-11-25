import type {
  BattlePayload,
  BattleWarriorSnapshot,
} from "@lootlog/battle-processor/battle-log";
import type { FightEvent, FightResult, FightSetup } from "./fight-simulator";
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

const damageKeys = (event: Strike, attacker: Combatant) =>
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

const triggerEntries = ({ triggers }: Strike): Entry[] => [
  valued("+engback", triggers.energyBack),
  valued("+injure", triggers.injure),
  [triggers.critWound, "+critwound"],
  valued("+actdmg", triggers.poisonResistanceDestroyed),
  valued("+critsa", triggers.critSpeed),
  valued("+critpoison_per", triggers.critPoison),
  valued("+critpierce", triggers.critPierce),
  [triggers.distracted, "+distract"],
];

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

export const fightBattlePayload = (
  setup: FightSetup,
  events: readonly FightEvent[],
  result: FightResult,
): BattlePayload => {
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
    const ticks = [
      {
        damage: event.poison,
        action: `poison=${reduced(event.poison, event.poisonReduction)}`,
      },
      {
        damage: event.wound,
        action: `wound=${reduced(event.wound, event.woundReduction)}`,
      },
      {
        damage: event.injure,
        action: `injure=${reduced(event.injure, event.lingeringReduction)}`,
      },
      {
        damage: event.critWound,
        action: `critwound=${reduced(event.critWound, event.lingeringReduction)}`,
      },
      { damage: event.anguish, action: `anguish=${event.anguish}` },
      {
        damage: event.fire,
        action: `fire=${reduced(event.fire, event.fireReduction)}`,
      },
      {
        damage: event.light,
        action: `light=${reduced(event.light, event.lightReduction)}`,
      },
      { damage: event.absolute, action: `absolute=${event.absolute}` },
    ].filter((tick) => tick.damage > 0);

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
      valued("heal_target", event.healed),
      valued("bandage", event.bandaged),
      [event.manaRestored > 0, `mana=-${event.manaRestored}`],
      [event.energyRestored > 0, `energy=-${event.energyRestored}`],
      valued("stealmana", event.manaStolen),
      valued("+manadest", event.manaDestroyed),
      valued("+endest", event.energyDestroyed),
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
    ...event.swings.map((swing) =>
      otherDamage(swing.damage, "a", swing.target, event.hp),
    ),
  ];

  const strikeActions = (event: Strike, attacker: Combatant) => {
    const damage = damageKeys(event, attacker);

    return [
      ...present([
        [event.crit, "+crit"],
        [event.offhandCrit, "+of_crit"],
        [event.veryCrit, "+legbon_verycrit"],
        [event.pierceShown, "+pierce"],
        [event.fastArrow, "+fastarrow"],
      ]),
      ...damage.map(([key, part]) => `+${key}=${event.strength[part]}`),
      ...present([
        [event.glare, "-legbon_glare"],
        [event.curse, "+legbon_curse"],
        valued("+acdmg", Math.round(event.armorDestroyed)),
        valued("+resdmg", event.resistanceDestroyed),
        valued("+abdest", event.absorbDestroyed),
        valued("+absorb", event.absorbRenewed),
        valued("+absorbm", event.absorbMagicRenewed),
        valued("+energy", event.energyBurned),
        drained("-endest", event.energyDrained),
        drained("-manadest", event.manaDrained),
        [
          event.armorDestructionReduction > 0,
          `-redacdmg_per=-${event.armorDestructionReduction}`,
        ],
        [event.evaded, "-evade"],
        [event.parried, "-parry"],
        [event.arrowBlocked, "-arrowblock"],
        valued("-blok", event.blocked),
        [event.pierceBlocked, "-pierceb"],
        [event.wounded, "+wound"],
        [event.stun, "+stun"],
        [event.freeze, "+freeze"],
        [event.anguish, "+legbon_anguish"],
        [event.holyTouch, "+legbon_holytouch"],
        valued("-absorb", event.absorbed),
        valued("-absorbm", event.absorbedMagic),
        valued("+legbon_puncture", event.puncture),
        valued("-legbon_critred", event.critred),
        valued("-legbon_facade", event.facade),
        [event.cleansed, "-legbon_cleanse"],
        [event.immune, "-immunity_to_dmg"],
        [event.countered, "-contra"],
        valued("+taken_dmg", event.takenBonus),
        valued("vamp_time", event.vamp),
        [event.swung, "+swing"],
        ...triggerEntries(event),
        valued(crushKey(attacker), event.crush),
        valued("+vulture", event.vulture),
        valued("-poison_lowdmg_per", event.poisonWeakened),
        [
          event.reflected > 0,
          otherDamage(event.reflected, "a", event.actor, event.hp),
        ],
      ]),
      ...event.swings.map((swing) =>
        otherDamage(swing.damage, " ", swing.target, event.hp),
      ),
      ...lastHeal(event.lastHeal, event.target, event.hp),
      ...damage.map(([key, part]) => `-${key}=${event.damage[part]}`),
      ...present([valued("-dmga", event.takenBonus + event.crushDamage)]),
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

  const rows = events.flatMap((event): string[] => {
    switch (event.kind) {
      case "step":
        return [`${sideAt(event.actor, event.hp)};0;step`];
      case "lostTurn":
        return [`0;0;txt=${nameOf(event.actor)} - utrata tury`];
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

  return {
    accountId: "simulation",
    characterId: SIMULATED_CHARACTER_ID,
    world: "simulation",
    events: [
      {
        ev: 0,
        f: { w: warriors, m: [...auraRows, ...rows, ...outcome], endBattle: 1 },
      },
    ],
  };
};
