import type { ParsedMove } from "@lootlog/battle-processor/battle-log";
import type { BattleWarrior } from "./battle-types";

const DAMAGE_CLASSES = [
  "dmg",
  "dmga",
  "dmgm",
  "dmgf",
  "dmgc",
  "dmgl",
  "dmgo",
  "dmgd",
] as const;

type DamageClass = (typeof DAMAGE_CLASSES)[number];

export type BattleMessageColor =
  | DamageClass
  | "white"
  | "wound"
  | "critWound"
  | "poison"
  | "heal"
  | "absolute"
  | "light"
  | "shout"
  | "lastHeal"
  | "third"
  | "crit"
  | "veryCrit"
  | "offhandCrit"
  | "offhandWound"
  | "critSlow"
  | "pierce"
  | "freeze"
  | "fastArrow"
  | "injure"
  | "legendaryVeryCrit"
  | "cleanse"
  | "glare"
  | "facade"
  | "anguish"
  | "block"
  | "evade"
  | "parry"
  | "friendly"
  | "enemy"
  | "crushFire"
  | "crushFrost"
  | "crushLight"
  | "crushPhysical"
  | "crushDistance";

export type BattleMessageSpan = {
  readonly text: string;
  readonly color?: BattleMessageColor;
  readonly bold?: boolean;
  readonly italic?: boolean;
};

export type BattleMessageLine = readonly BattleMessageSpan[];

export type BattleMessageKind =
  | "attack"
  | "attack2"
  | "neu"
  | "txt"
  | "win"
  | "lose"
  | "loot"
  | "exp"
  | "plain";

export type BattleMessage = {
  readonly kind: BattleMessageKind;
  readonly lines: readonly BattleMessageLine[];
};

export type BattleMessageFighter = {
  readonly name: string;
  readonly team: number;
};

export type BattleMessageContext = {
  readonly fighter: (id: string) => BattleMessageFighter | undefined;
  readonly text: (key: string) => string;
};

type Style = Omit<BattleMessageSpan, "text">;

type Params = Readonly<Record<string, string | number>>;

type Section = 0 | 1 | 2;

type Action = {
  readonly key: string;
  readonly value: string;
  readonly part0: string;
  readonly part1: string;
  readonly part2: string;
  readonly isMultiple: boolean;
  readonly name: string;
};

type Builder = {
  readonly first: BattleMessageFighter;
  readonly second: BattleMessageFighter;
  readonly firstHp: string;
  readonly castTarget: string;
  readonly text: (key: string) => string;
  readonly say: (
    section: Section,
    key: string,
    params?: Params,
    style?: Style,
  ) => void;
  readonly push: (section: Section, spans: BattleMessageLine) => void;
  readonly attack: (span: BattleMessageSpan) => void;
  readonly take: (span: BattleMessageSpan) => void;
  readonly setKind: (kind: BattleMessageKind | "auto") => void;
};

type Handler = (action: Action, builder: Builder) => void;

type KindState = { kind: BattleMessageKind | "auto" | "" };

const MISSING_FIGHTER = "BŁĄD#1!";

const DAMAGE_STYLES = new Map<string, Style>(
  DAMAGE_CLASSES.map((damageClass) => [
    damageClass,
    { bold: true, color: damageClass },
  ]),
);

const damageStyle = (damageClass: string): Style =>
  DAMAGE_STYLES.get(damageClass) ?? { bold: true };

const signed = (value: number | string) =>
  Number(value) >= 0 ? `+${value}` : `${value}`;

const replaceEvery = (text: string, search: string, replacement: string) =>
  text.split(search).join(replacement);

const fill = (template: string, params: Params = {}) =>
  replaceEvery(
    Object.entries(params).reduce(
      (text, [placeholder, value]) =>
        replaceEvery(text, placeholder, String(value)),
      replaceEvery(replaceEvery(template, "#", ""), "$", ""),
    ),
    "++",
    "+",
  );

export const formatBattleHp = (hp: number | null) => {
  if (hp === null) return "";

  return hp === 0 || hp === 100 ? String(hp) : hp.toFixed(2);
};

const line =
  (section: Section, key: string, style: Style = {}): Handler =>
  (_action, { say }) => {
    say(section, key, {}, style);
  };

const valueLine =
  (section: Section, key: string, style: Style = {}): Handler =>
  ({ value }, { say }) => {
    say(section, key, { "%val%": value, "%m1%": value }, style);
  };

const named =
  (key: string, style: Style = {}): Handler =>
  ({ name }, { say }) => {
    say(1, key, { "%name%": name }, style);
  };

const namedValue =
  (key: string, style: Style = {}): Handler =>
  ({ name, value }, { say }) => {
    say(1, key, { "%name%": name, "%val%": value }, style);
  };

const namedOpponent =
  (key: string): Handler =>
  ({ name }, { say, second }) => {
    say(1, key, { "%name%": name, "%target%": second.name });
  };

const castOnTarget =
  (key: string): Handler =>
  ({ name }, { say, castTarget }) => {
    say(1, key, { "%name%": name, "%target%": castTarget });
  };

const reduced =
  (singleKey: string, multiKey: string, style: Style): Handler =>
  ({ name, value, part0, part1, isMultiple }, { say }) => {
    if (isMultiple) {
      say(
        1,
        multiKey,
        { "%name%": name, "%val0%": part0, "%val1%": part1 },
        style,
      );
    } else {
      say(1, singleKey, { "%name%": name, "%val%": value }, style);
    }
  };

const withSecondValue =
  (singleKey: string, multiKey: string): Handler =>
  ({ part0, part1, isMultiple }, { say }) => {
    if (isMultiple) {
      say(1, multiKey, { "%val%": part0, "%val2%": part1 });
    } else {
      say(1, singleKey, { "%val%": part0 });
    }
  };

const crush =
  (color: BattleMessageColor): Handler =>
  ({ value }, { say }) => {
    say(1, "eng_game_only_val_+crush %val%", { "%val%": value }, { color });
  };

const aura =
  (key: string): Handler =>
  ({ name, value }, { say, first, second }) => {
    say(
      1,
      key,
      { "%val%": signed(value), "%name%": name },
      { color: second.team === first.team ? "friendly" : "enemy" },
    );
  };

const outcome =
  (
    single: string,
    team: string,
    kind: BattleMessageKind,
    noWinner?: string,
  ): Handler =>
  ({ value }, { say, setKind }) => {
    if (noWinner && value === "?") say(1, noWinner);
    else if (value.includes(",")) say(1, team, { "%name%": value });
    else say(1, single, { "%posfix%": "", "%name%": value });

    setKind(kind);
  };

const loot =
  (key: string): Handler =>
  ({ name, value }, { say, setKind }) => {
    say(1, key, { "%name%": name, "%g1%": "", "%m1%": value });
    setKind("loot");
  };

const spellStart =
  (key: string): Handler =>
  ({ name, value }, { say, setKind }) => {
    say(1, key, { "%name%": name, "%name2%": value });
    setKind("auto");
  };

const healTarget =
  (targetOf: (action: Action, builder: Builder) => string): Handler =>
  (action, builder) => {
    const target = targetOf(action, builder);

    if (action.isMultiple) {
      builder.say(1, "msg_heal_target-multi %target% %val% %val2%", {
        "%target%": target,
        "%val%": action.part0,
        "%val2%": action.part1,
      });
    } else {
      builder.say(1, "msg_heal_target %target% %val%", {
        "%target%": target,
        "%val%": action.part0,
      });
    }
  };

const heal: Handler = (
  { name, value, part0, part1, isMultiple },
  { say, text },
) => {
  const style: Style = { color: "heal", italic: true };

  const gainLost = (amount: string) =>
    text(Number(amount) >= 0 ? "part_gained" : "part_lost");

  if (!isMultiple) {
    say(
      1,
      "msg_heal %gain_lost% %name% %val%",
      { "%name%": name, "%val%": value, "%gain_lost%": gainLost(value) },
      style,
    );

    return;
  }

  const change = Number(part1);

  say(
    1,
    "msg_heal %gain_lost% %name% %val0% %val1%",
    {
      "%name%": name,
      "%val0%": part0,
      "%val1%": Math.abs(change),
      "%inc_dec%": text(change > 0 ? "increased" : "decreased"),
      "%gain_lost%": gainLost(part0),
    },
    style,
  );
};

const reuseArrows: Handler = ({ name, value }, { push, text }) => {
  const count = Number(value);

  const recovered =
    count === 1
      ? text("msg_reusearrows_one")
      : fill(text("msg_reusearrows %val% %arrows%"), {
          "%val%": value,
          "%arrows%": text(
            count < 5 ? "part_arrows_plural1" : "part_arrows_plural2",
          ),
        });

  push(1, [{ text: `${recovered} ${name}.`, color: "poison", italic: true }]);
};

const injure: Handler = (
  { name, value, part0, part1, isMultiple },
  { say },
) => {
  const style: Style = { color: "poison", italic: true };

  if (isMultiple) {
    say(
      1,
      "msg_injure %name% %val0% %val1%",
      { "%name%": name, "%val%": part0, "%val1%": part1 },
      style,
    );
  } else {
    say(
      1,
      "msg_injure %name% %val%",
      { "%name%": name, "%val%": value },
      style,
    );
  }
};

const frost: Handler = (action, builder) => {
  if (action.isMultiple) {
    reduced("msg_frost %name% %val%", "msg_frost %name% %val0% %val1%", {
      color: "wound",
      italic: true,
    })(action, builder);
  } else {
    builder.say(1, "msg_frost %name% %val%", {
      "%name%": action.name,
      "%val%": action.value,
    });
  }
};

const anguish: Handler = (
  { part0, part1, isMultiple },
  { say, first, firstHp },
) => {
  const params = { "%name%": first.name, "%hpp%": firstHp, "%val0%": part0 };

  if (isMultiple) {
    say(1, "msg_anguish %name% %hpp% %val0% %val1%", {
      ...params,
      val1: part1,
    });
  } else {
    say(1, "msg_anguish %name% %hpp% %val0%", params);
  }
};

const otherDamage: Handler = (
  { part0, part1, part2 },
  { push, text, setKind },
) => {
  const [template = "", rest = ""] = text("msg_+oth_dmg %val% %name%").split(
    "</b>",
  );

  push(1, [
    { text: fill(template, { "%val%": part0 }), ...damageStyle(`dmg${part1}`) },
    { text: fill(rest, { "%name%": part2 }) },
  ]);
  setKind("auto");
};

const flee: Handler = (_action, { say, first, firstHp, setKind }) => {
  say(1, "msg_flee %name% %hp%", {
    "%name%": first.name,
    "%hp%": `${firstHp}%`,
  });
  setKind("txt");
};

const plainText: Handler = ({ value }, { push, setKind }) => {
  push(1, [{ text: value }]);
  setKind("txt");
};

const thirdAttack: Handler = ({ value }, { say, attack }) => {
  say(1, "+third_strike", {}, { color: "third", bold: true });
  attack({ text: `+${value}`, bold: true });
};

const receiveMana: Handler = ({ name, value }, { say }) => {
  if (Number(value) <= 0) {
    say(1, "msg_receivemana %name% %val%", {
      "%name%": name,
      "%val%": Math.abs(Number(value)),
    });
  }
};

const energy: Handler = ({ name, value }, { say, text }) => {
  say(1, "msg_energy %name% %gain_loss% %val%", {
    "%name%": name,
    "%gain_loss%": text(Number(value) > 0 ? "part_loss_en" : "part_gain_en"),
    "%val%": Math.abs(Number(value)),
  });
};

const energyRegen: Handler = ({ name, value }, { say, text }) => {
  say(1, "msg_en-regen %gain_lost% %name% %val%", {
    "%name%": name,
    "%val%": value,
    "%gain_lost%": text(Number(value) > 0 ? "part_gained" : "part_lost"),
  });
};

const bandage: Handler = ({ name, part0, part1, isMultiple }, { say }) => {
  if (isMultiple) {
    say(1, "msg_aura-bandage-multi %val% %val2%", {
      "%name%": name,
      "%val%": part0,
      "%val2%": part1,
    });
  } else {
    say(1, "msg_aura-bandage %val%", { "%val%": part0, "%name%": name });
  }
};

const healAll: Handler = ({ name, part0, part1, isMultiple }, { say }) => {
  if (isMultiple) {
    say(1, "msg_healall_per_multi %name% %val% %val2%", {
      "%name%": name,
      "%val%": part0,
      "%val2%": part1,
    });
  } else {
    say(1, "msg_healall_per %name% %val%", { "%name%": name, "%val%": part0 });
  }
};

const vampTime: Handler = ({ part0, part1, isMultiple }, { say }) => {
  if (isMultiple) {
    say(1, "eng_game_only_val_vamp_time %val% %val2%", {
      "%val%": part0,
      "%val2%": part1,
    });
  } else {
    say(1, "eng_game_only_val_vamp_time %val%", { "%val%": part0 });
  }
};

const LINES: readonly (readonly [string, Section, string, Style?])[] = [
  ["allslow", 1, "msg_allslow"],
  ["arrowrain", 1, "msg_arrowrain"],
  ["blizzard", 1, "msg_blizzard"],
  ["cover", 1, "msg_cover"],
  ["disturb", 1, "msg_disturb"],
  ["poisonspread_failkey", 1, "msg_poisonspread_failkey"],
  ["removeslow-allies", 1, "msg_removeslow-allies"],
  ["removestun-allies", 1, "msg_removestun-allies"],
  ["of-woundstart", 1, "msg_of-woundstart"],
  ["+superspell-dispel", 1, "msg_+dispel"],
  ["-tenacity", 1, "msg_-tenacity"],
  ["+wound", 1, "msg_+wound"],
  ["+critwound", 1, "msg_+critwound"],
  ["+acdmg_destroyed", 1, "msg_+acdmg_destroyed"],
  ["+stun", 1, "msg_+stun"],
  ["+stun2", 1, "msg_+stun2"],
  ["+stun2-f", 1, "msg_+stun2-f"],
  ["+stun2-l", 1, "msg_+stun2-l"],
  ["+stun2-c", 1, "msg_+stun2-c"],
  ["+stun2-d", 1, "msg_+stun2-d"],
  ["+immobilize", 1, "msg_+immobilize"],
  ["+distract", 1, "msg_+distract"],
  ["+swing", 1, "msg_+swing"],
  ["+firearrow", 1, "msg_+firearrow"],
  ["dmg_hpp", 1, "msg_-dmg_hpp"],
  ["+mcurse", 1, "msg_+mcurse"],
  ["+legbon_pushback", 1, "msg_+legbon_pushback"],
  ["blackout", 1, "msg_blackout"],
  ["critstagnation", 1, "msg_critstagnation"],
  ["distractshoot", 1, "msg_distractshoot"],
  ["disturbshoot", 1, "msg_disturbshoot"],
  ["removedot", 1, "skill_removedot"],
  ["removedot-allies", 1, "skill_removedot-allies"],
  ["removestun", 1, "skill_removestun"],
  ["-immunity_to_dmg", 1, "end-game-without-percent-immunity_to_dmg"],
  ["+spell-taken_dmg-all", 1, "end-game-without-percent+spell-taken_dmg-all"],
  ["+crit", 1, "msg_+crit", { color: "crit", italic: true }],
  [
    "+verycrit",
    1,
    "msg_+verycrit",
    { color: "veryCrit", italic: true, bold: true },
  ],
  [
    "+of_crit",
    1,
    "msg_+of_crit",
    { color: "offhandCrit", italic: true, bold: true },
  ],
  [
    "+of_wound",
    1,
    "msg_+of_wound",
    { color: "offhandWound", italic: true, bold: true },
  ],
  ["+pierce", 1, "msg_+pierce", { color: "pierce" }],
  ["+freeze", 1, "msg_+freeze", { color: "freeze", italic: true }],
  ["+fastarrow", 1, "msg_+fastarrow", { color: "fastArrow", italic: true }],
  [
    "+legbon_verycrit",
    1,
    "msg_+legbon_verycrit",
    { color: "legendaryVeryCrit", bold: true, italic: true },
  ],
  ["+legbon_curse", 1, "msg_+legbon_curse", { color: "glare", bold: true }],
  [
    "+legbon_holytouch",
    1,
    "msg_+legbon_holytouch %val%",
    { color: "lastHeal", italic: true, bold: true },
  ],
  [
    "-legbon_cleanse",
    2,
    "msg_-legbon_cleanse",
    { color: "cleanse", bold: true },
  ],
  ["-legbon_glare", 2, "msg_-legbon_glare", { color: "glare", bold: true }],
  ["+superspell-prevented", 2, "msg_+superspell-prevented"],
  ["-evade", 2, "msg_-evade", { color: "evade", bold: true }],
  ["-parry", 2, "msg_-parry", { color: "parry" }],
  ["-pierceb", 2, "msg_-pierceb", { color: "block", bold: true }],
  ["-contra", 2, "msg_-contra"],
  ["-rage", 2, "msg_-rage"],
  ["-arrowblock", 2, "msg_-arrowblock"],
  ["-legbon_resgain", 2, "msg_-legbon_resgain"],
];

const VALUE_LINES: readonly (readonly [string, Section, string, Style?])[] = [
  ["-redabdest_per", 1, "msg_redabdest_per %m1%"],
  ["+woundpoison", 1, "msg_woundpoison %val%"],
  ["+of_woundpoison", 1, "msg_of_woundpoison %val%"],
  ["+woundmagic", 1, "msg_woundmagic %val%"],
  ["+of_woundmagic", 1, "msg_of_woundmagic %val%"],
  ["achpp_per", 1, "achpp_per"],
  ["aura-ac", 1, "msg_aura-ac %val%"],
  ["-poison_lowdmg_per", 1, "msg_-poison_lowdmg_per %val%"],
  ["+energy", 1, "msg_+energy %val%"],
  ["energyout", 1, "msg_energyout %val%"],
  ["antidote", 1, "msg_antidote %val%"],
  ["combo-max", 1, "msg_combo-max"],
  ["lowheal_per-enemies", 1, "msg_lowheal_per-enemies val"],
  ["+critslow_per", 1, "msg_+critslow_per= %val%"],
  ["+critsa_per", 1, "msg_+critsa_per %val%"],
  ["+critsa", 1, "msg_+critsa %val%"],
  ["+acdmg", 1, "msg_+acdmg %val%"],
  ["+resdmg", 1, "msg_+resdmg %val%"],
  ["+abdest", 1, "msg_+abdest %val%"],
  ["+actdmg", 1, "msg_+actdmg %val%"],
  ["resfire_per", 1, "msg_resfire_per %val%"],
  ["reslight_per", 1, "msg_reslight_per %val%"],
  ["resfrost_per", 1, "msg_resfrost_per %val%"],
  ["+resdmgf", 1, "msg_+resdmgf %val%"],
  ["+resdmgc", 1, "msg_+resdmgc %val%"],
  ["+resdmgl", 1, "msg_+resdmgl %val%"],
  ["-legbon_dmgred", 1, "msg_-legbon_dmgred %val%"],
  ["-legbon_retaliation", 1, "msg_-legbon_retaliation %val%"],
  ["+legbon_frenzy_main", 1, "msg_+legbon_frenzy_main %val%"],
  ["+legbon_frenzy_off", 1, "msg_+legbon_frenzy_off %val%"],
  ["-redmanadest", 1, "msg_-redmanadest %val%"],
  ["-redendest", 1, "msg_-redendest %val%"],
  ["+lowheal2turns", 1, "msg_+lowheal2turns %val%"],
  ["-lowcritallval", 1, "msg_-lowcritallval %val%"],
  ["+exp", 1, "msg_+exp %val%"],
  ["+ph", 1, "msg_+ph %val%"],
  ["+critslow", 1, "msg_+hithurt %val%", { color: "critSlow", italic: true }],
  [
    "+injure",
    1,
    "msg_+injure %val%",
    { color: "injure", bold: true, italic: true },
  ],
  [
    "-legbon_facade",
    1,
    "msg_-legbon_facade %val%",
    { color: "facade", bold: true, italic: true },
  ],
  [
    "+legbon_anguish",
    1,
    "msg_+legbon_anguish %val%",
    { color: "anguish", bold: true },
  ],
  ["+woundfrost", 1, "msg_woundfrost %val%", { color: "wound", italic: true }],
  ["-blok", 2, "msg_-blok %val%", { color: "block", bold: true }],
  ["+rage", 2, "msg_+rage %val%"],
  ["+absorb", 2, "msg_+absorb %val%"],
  ["-absorb", 2, "msg_-absorb %val%"],
  ["+absorbm", 2, "msg_+absorbm %val%"],
  ["-absorbm", 2, "msg_-absorbm %val%"],
  [
    "-legbon_critred",
    2,
    "msg_-legbon_critred %val%",
    { color: "facade", bold: true },
  ],
  [
    "+legbon_puncture",
    2,
    "msg_+legbon_puncture %val%",
    { color: "anguish", bold: true, italic: true },
  ],
  ["+vulture", 2, "msg_+vulture= %val%"],
  ["-reddest_per", 2, "msg_-reddest_per %val%"],
  ["-redacdmg", 2, "msg_-redacdmg %val%"],
  ["-redacdmg_per", 2, "msg_-redacdmg_per %val%"],
  ["-redmanadest_per", 2, "msg_-redmanadest_per %val%"],
  ["-redendest_per", 2, "msg_-redendest_per %val%"],
  ["+critpoison_per", 2, "msg_+critpoison_per %val%"],
  ["+crush", 1, "eng_game_only_val_+crush %val%"],
  ["+taken_dmg", 1, "eng_game_only_val_+taken_dmg %val%"],
  ["+critpierce", 1, "eng_game_only_val_+critpierce %val%"],
  ["critval-enemies", 1, "eng_game_only_val_critval-enemies %val%"],
  ["critmval-enemies", 1, "eng_game_only_val_critmval-enemies %val%"],
  ["critval-allies", 1, "eng_game_only_val_critval-allies %val%"],
  ["critmval-allies", 1, "eng_game_only_val_critmval-allies %val%"],
  [
    "active_decblock_per-enemies",
    1,
    "msg_only_val_active_decblock_per-enemies",
  ],
  ["active_block_per", 1, "msg_only_val_active_block_per"],
  ["+abdest_per", 1, "msg_only_val_+abdest_per"],
  ["+abmdest_per", 1, "msg_only_val_+abmdest_per"],
  ["active_resall_per", 1, "msg_only_val_active_resall_per"],
];

const HIDDEN_KEYS = [
  "-reddest_per0",
  "firewall",
  "skillId",
  "chainlightning",
  "+rotatingblade",
  "daggerthrow",
  "balloflight",
  "active_decblock_per",
  "active_absorbdest_per",
];

const NEUTRAL_KEYS: ReadonlySet<string> = new Set([
  "+woundfrost",
  "+woundpoison",
  "+of_woundpoison",
  "+woundmagic",
  "+of_woundmagic",
  "step",
  "afterheal",
  "reusearrows",
  "wound",
  "critwound",
  "injure",
  "poison",
  "heal",
  "absolute",
  "fire",
  "light",
  "shout",
  "en-regen",
  "legbon_holytouch_heal",
  "anguish",
]);

const KIND_BY_KEY = new Map<string, BattleMessageKind | "auto">([
  ["+exp", "exp"],
  ["+ph", "win"],
  ["npc_heal", "auto"],
  ["tcustom", "txt"],
]);

const HANDLERS = new Map<string, Handler>([
  ...HIDDEN_KEYS.map((key): [string, Handler] => [key, () => undefined]),
  ...LINES.map(([key, section, template, style]): [string, Handler] => [
    key,
    line(section, template, style),
  ]),
  ...VALUE_LINES.map(([key, section, template, style]): [string, Handler] => [
    key,
    valueLine(section, template, style),
  ]),
  [
    "winner",
    outcome(
      "winner_is %name% %posfix%",
      "winner_team_is %name% %posfix%",
      "win",
      "battle_no_winner",
    ),
  ],
  [
    "loser",
    outcome(
      "loser_is %name% %posfix%",
      "loser_team_is %name% %posfix%",
      "lose",
    ),
  ],
  ["flee", flee],
  ["txt", plainText],
  ["loot", loot("msg_loot %name% %g1% %m1%")],
  ["dloot", loot("msg_dloot %name% %g1% %m1%")],
  [
    "step",
    ({ name }, { say }) =>
      say(
        1,
        "msg_step %name% %g1%",
        { "%name%": name, "%g1%": "" },
        { color: "white" },
      ),
  ],
  [
    "afterheal",
    namedValue("msg_afterheal %name% %val%", { color: "heal", italic: true }),
  ],
  ["reusearrows", reuseArrows],
  [
    "wound",
    reduced("msg_wound %name% %val%", "msg_wound_multi %name% %val0% %val1%", {
      color: "wound",
      italic: true,
    }),
  ],
  [
    "critwound",
    reduced(
      "msg_critwound %name% %val%",
      "msg_critwound %name% %val0% %val1%",
      { color: "critWound", italic: true, bold: true },
    ),
  ],
  ["injure", injure],
  [
    "poison",
    reduced("msg_poison %name% %val%", "msg_poison %name% %val0% %val1%", {
      color: "poison",
      italic: true,
    }),
  ],
  ["heal", heal],
  [
    "absolute",
    namedValue("msg_absolute %name% %val%", {
      color: "absolute",
      italic: true,
    }),
  ],
  [
    "fire",
    reduced("msg_fire %name% %val%", "msg_fire %name% %val0% %val1%", {
      color: "absolute",
      italic: true,
    }),
  ],
  [
    "light",
    reduced("msg_light %name% %val%", "msg_light %name% %val0% %val1%", {
      color: "light",
      italic: true,
    }),
  ],
  ["frost", frost],
  [
    "shout",
    ({ name, value }, { say }) =>
      say(
        1,
        "msg_shout %name%",
        { "%name%": name, "%name2%": value },
        { color: "shout" },
      ),
  ],
  ["en-regen", energyRegen],
  ["aura-ac_per", aura("msg_aura-ac_per %val% %name%")],
  ["aura-resall", aura("msg_aura-resall %val% %name%")],
  ["aura-sa_per", aura("msg_aura-sa_per_new %val% %name%")],
  [
    "aura-sa",
    ({ value }, { say }) =>
      say(1, "msg_aura-sa %val%", { "%val%": signed(Number(value) / 100) }),
  ],
  ["bandage", bandage],
  ["physical", namedValue("msg_physical %name% %val%")],
  [
    "poison_lowdmg_per-enemies",
    ({ value }, { say, first }) =>
      say(1, "msg_poison_lowdmg_per-enemies %val%", {
        "%name%": first.name,
        "%val%": value,
      }),
  ],
  ["doubleshoot", named("msg_doubleshoot %name%")],
  ["thunder", named("msg_thunder %name%")],
  ["storm", named("msg_storm %name%")],
  ["soullink", named("msg_soullink %name%")],
  ["chainlightning_perw", named("msg_chainlightning_perw %name%")],
  ["ansgame", named("msg_ansgame")],
  ["energy", energy],
  ["en-regen-cast", castOnTarget("msg_en-regen-cast %name% %target%")],
  ["heal_per", castOnTarget("msg_heal_per %name%")],
  ["mlightshiled", castOnTarget("msg_mlightshiled %name%")],
  ["fireshield", castOnTarget("msg_fireshield %name%")],
  ["lightshield2", castOnTarget("msg_lightshield2 %name%")],
  ["lightshield", castOnTarget("msg_lightshield %name%")],
  ["frostshield", castOnTarget("msg_frostshield %name%")],
  ["sunshield_per", castOnTarget("msg_sunshield %name%")],
  ["sunshield", castOnTarget("msg_sunshield %name%")],
  ["sunreduction", castOnTarget("msg_sunreduction %name%")],
  ["footshoot", castOnTarget("msg_footshoot %name%")],
  [
    "stealmana",
    ({ value }, { say, second }) =>
      say(1, "msg_stealmana %name%", {
        "%val%": value,
        "%target%": second.name,
      }),
  ],
  [
    "rime_per",
    ({ name, part0 }, { say }) =>
      say(1, "msg_rime_per %val% %name%", { "%val%": part0, "%name%": name }),
  ],
  ["trickyknife", namedOpponent("msg_trickyknife %name% %target%")],
  ["woundextend", namedOpponent("msg_woundextend %name% %target%")],
  [
    "spell-taken_dmg",
    namedOpponent("eng_game_nick_and_opponent_spell-taken_dmg %name% %target%"),
  ],
  [
    "-spell-distortion",
    namedOpponent(
      "eng_game_nick_and_opponent_-spell-distortion %name% %target%",
    ),
  ],
  [
    "-spell-immunity_to_dmg",
    named("eng_game_nick_and_friendnick_-spell-immunity_to_dmg %name%"),
  ],
  ["healall_per", healAll],
  ["healall", namedValue("msg_healall %name% %val%")],
  [
    "manatransfer",
    ({ name, value }, { say, second }) =>
      say(1, "msg_manatransfer %name% %val% %name2%", {
        "%name2%": second.name,
        "%name%": name,
        "%val%": value,
      }),
  ],
  [
    "poisonspread",
    ({ value }, { push, text }) =>
      push(1, [{ text: `${text("msg_poisonspread")}${value}` }]),
  ],
  [
    "stinkbomb",
    ({ name }, { say, second }) =>
      say(1, "msg_stinkbomb %name% %name2%", {
        "%name%": name,
        "%name2%": second.name,
      }),
  ],
  [
    "managain",
    ({ name, value }, { say }) =>
      say(1, "msg_managain %name% %val%", {
        "%name%": name,
        "%val%": signed(value),
      }),
  ],
  [
    "insult",
    ({ name, value }, { say, second }) =>
      say(1, "msg_insult %name% %name2% %val%", {
        "%name%": name,
        "%val%": value,
        "%name2%": second.name,
      }),
  ],
  ["prepare", spellStart("msg_prepare %name%")],
  ["tspell", spellStart("msg_tspell %name%")],
  [
    "legbon_lastheal",
    ({ part0, part1 }, { say }) =>
      say(
        1,
        "msg_legbon_lastheal %val%",
        { "%val%": part1, "%val2%": part0 },
        { color: "lastHeal", bold: true },
      ),
  ],
  ["+oth_dmg", otherDamage],
  [
    "+oth_cover",
    ({ part0, part2 }, { say }) =>
      say(1, "msg_+oth_cover %val% %name%", {
        "%val%": part0,
        "%name%": part2,
      }),
  ],
  [
    "+of_dmg",
    ({ value }, { attack }) =>
      attack({ text: `+${value}`, ...damageStyle("dmgo") }),
  ],
  ["+thirdatt", thirdAttack],
  [
    "-thirdatt",
    ({ value }, { take }) => take({ text: `-${value}`, bold: true }),
  ],
  [
    "+engback",
    ({ value }, { say }) =>
      say(1, "msg_+engback %val%", { "%val%": signed(value) }),
  ],
  [
    "+manadest",
    withSecondValue("msg_+manadest %val%", "msg_+manadest_multi %val%"),
  ],
  [
    "-manadest",
    withSecondValue("msg_-manadest %val%", "msg_-manadest_multi %val%"),
  ],
  ["+endest", withSecondValue("msg_+endest %val%", "msg_+endest_multi %val%")],
  ["-endest", withSecondValue("msg_-endest %val%", "msg_-endest_multi %val%")],
  ["mana", receiveMana],
  [
    "legbon_holytouch_heal",
    ({ name, value }, { say }) =>
      say(
        1,
        "msg_legbon_holytouch_heal %val%",
        { "%val%": value, "%name%": name },
        { color: "lastHeal", italic: true, bold: true },
      ),
  ],
  ["anguish", anguish],
  [
    "-resmanaendest",
    ({ part0, part1 }, { say }) =>
      say(2, "msg_-resmanaendest %val%", { "%val1%": part0, "%val2%": part1 }),
  ],
  [
    "alllowdmg",
    ({ part0, part2 }, { say }) =>
      say(1, "msg_alllowdmg %val% %name%", { "%val%": part0, "%name%": part2 }),
  ],
  [
    "allslow_per",
    ({ name, part0 }, { say }) =>
      say(1, "msg_allslow_per %val% %name%", {
        "%val%": part0,
        "%name%": name,
      }),
  ],
  [
    "aura-adddmg2_per-meele",
    ({ name, value }, { say }) =>
      say(1, "msg_blesswords_perw %val% %name%", {
        "%val%": value,
        "%name%": name,
      }),
  ],
  [
    "vamp",
    ({ name, value }, { say, second }) =>
      say(1, "msg_vamp %val%", {
        "%name%": name,
        "%target%": second.name,
        "%val%": value,
      }),
  ],
  ["heal_target", healTarget((_action, { second }) => second.name)],
  ["npc_heal", healTarget(({ name }) => name)],
  [
    "surpass_bonus_total",
    ({ name, value }, { say }) =>
      say(1, "surpass_bonus_total %val% %name%", {
        "%val%": value,
        "%name%": name.replace(/\(.+?\)/, ""),
      }),
  ],
  ["vamp_time", vampTime],
  [
    "+spell-taken_dmg",
    ({ value }, { say }) =>
      say(1, "eng_game_only_nick_+spell-taken_dmg %name%", { "%name%": value }),
  ],
  [
    "+spell-vamp_time",
    (_action, { say, second }) =>
      say(1, "eng_game_only_nick_+spell-vamp_time %name%", {
        "%name%": second.name,
      }),
  ],
  [
    "distortion",
    (_action, { say, second }) =>
      say(1, "eng_game_only_nick_distortion %name%", { "%name%": second.name }),
  ],
  [
    "stinkbomb_crit",
    (_action, { say, second }) =>
      say(1, "eng_game_only_nick_stinkbomb_crit %name%", {
        "%name%": second.name,
      }),
  ],
  [
    "stinkbomb_pierce",
    (_action, { say, second }) =>
      say(1, "eng_game_only_nick_stinkbomb_pierce %name%", {
        "%name%": second.name,
      }),
  ],
  [
    "heal_per-allies",
    ({ value }, { say, first }) =>
      say(1, "eng_game_nick_and_value_heal_per-allies %name% %val%", {
        "%name%": first.name,
        "%val%": value,
      }),
  ],
  [
    "heal_per-enemies",
    ({ value }, { say, first }) =>
      say(1, "eng_game_nick_and_value_heal_per-enemies %name% %val%", {
        "%name%": first.name,
        "%val%": value,
      }),
  ],
  [
    "hp_per-allies",
    ({ value }, { say, first }) =>
      say(1, "eng_game_nick_and_value_hp_per-allies %name% %val%", {
        "%name%": first.name,
        "%val%": value,
      }),
  ],
  [
    "hp_per-enemies",
    ({ value }, { say, first }) =>
      say(1, "eng_game_nick_and_value_hp_per-enemies %name% %val%", {
        "%name%": first.name,
        "%val%": value,
      }),
  ],
  [
    "dmg-target_physical",
    ({ value }, { say, second }) =>
      say(
        1,
        "eng_game_opponent_nick_and_value_dmg-target_physical %target% %val%",
        { "%target%": second.name, "%val%": value },
      ),
  ],
  [
    "tcustom",
    ({ value }, { say, second }) =>
      say(1, "msg_tcustom_target %target% %val%", {
        "%target%": second.name,
        "%val%": value,
      }),
  ],
  ["+crush_fire", crush("crushFire")],
  ["+crush_frost", crush("crushFrost")],
  ["+crush_light", crush("crushLight")],
  ["+crush_physical", crush("crushPhysical")],
  ["+crush_distance", crush("crushDistance")],
]);

const damage: Handler = ({ key, value }, { attack, take }) => {
  const style = damageStyle(key.slice(1));

  if (key.startsWith("+")) attack({ text: `+${value}`, ...style });
  else take({ text: `-${value}`, ...style });
};

const unknown: Handler = ({ key, value }, { push, text }) => {
  const [label = ""] = text("msg_unknown_prameter %val%").split("<b>");

  push(2, [
    { text: label },
    { text: value === "" ? key : `${key}=${value}`, bold: true },
  ]);
};

const handlerFor = (key: string) =>
  HANDLERS.get(key) ?? (key.slice(1, 4) === "dmg" ? damage : unknown);

const fighterOf = (
  id: string | null,
  fighter: BattleMessageContext["fighter"],
): BattleMessageFighter =>
  id === null
    ? { name: MISSING_FIGHTER, team: 1 }
    : (fighter(id) ?? { name: id, team: 1 });

export const buildBattleMessage = (
  move: ParsedMove,
  { fighter, text }: BattleMessageContext,
): BattleMessage => {
  const sections: BattleMessageLine[][] = [[], [], []];
  const attackSpans: BattleMessageSpan[] = [];
  const takeSpans: BattleMessageSpan[] = [];
  const state: KindState = { kind: "" };

  const first = fighterOf(move.attackerId, fighter);
  const second = fighterOf(move.defenderId, fighter);
  const firstHp = formatBattleHp(move.attackerHpPercentage);
  const secondHp = formatBattleHp(move.defenderHpPercentage);
  const actions = move.actions.filter(({ actionType }) => actionType !== "");
  const attackKind = first.team < 2 ? "attack" : "attack2";

  const isDamageOverTime =
    move.attackerId !== null &&
    move.defenderId === null &&
    move.attackerHpPercentage !== null;

  const builder: Builder = {
    first,
    second,
    firstHp,
    castTarget:
      move.attackerId === move.defenderId ? text("part_himself") : second.name,
    text,
    say: (section, key, params = {}, style = {}) => {
      sections[section]?.push([{ text: fill(text(key), params), ...style }]);
    },
    push: (section, spans) => {
      sections[section]?.push(spans);
    },
    attack: (span) => {
      attackSpans.push(span);
    },
    take: (span) => {
      takeSpans.push(span);
    },
    setKind: (next) => {
      state.kind = next;
    },
  };

  actions.forEach(({ actionType: key, param: value }, index) => {
    const [part0 = "", part1 = "", part2 = ""] = value.split(",");

    if (NEUTRAL_KEYS.has(key)) state.kind = "neu";

    handlerFor(key)(
      {
        key,
        value,
        part0,
        part1,
        part2,
        isMultiple: value.includes(","),
        name:
          isDamageOverTime && index === actions.length - 1
            ? `${first.name}(${firstHp}%)`
            : first.name,
      },
      builder,
    );

    state.kind = KIND_BY_KEY.get(key) ?? state.kind;
  });

  const damageLine = (
    key: string,
    fighterName: string,
    hp: string,
    spans: readonly BattleMessageSpan[],
  ): BattleMessageLine => {
    const [before = "", after = ""] = fill(text(key), {
      "%name1%": fighterName,
      "%hpp%": hp,
    }).split("%val%");

    return [{ text: before }, ...spans, { text: after }].filter(
      (span) => span.text !== "",
    );
  };

  if (attackSpans.length > 0) {
    state.kind = attackKind;
    sections[0]?.push(
      damageLine(
        "msg_dmgdone %name1% %hpp% %val%",
        first.name,
        firstHp,
        attackSpans,
      ),
    );
    sections[2]?.push(
      damageLine(
        "msg_dmgtaken %name1% %hpp% %val%",
        second.name,
        secondHp,
        takeSpans,
      ),
    );
  }

  return {
    kind:
      state.kind === "auto"
        ? attackKind
        : state.kind === ""
          ? "plain"
          : state.kind,
    lines: sections.flat(),
  };
};

export const battleMessageText = (message: BattleMessage) =>
  message.lines
    .map((spans) => spans.map((span) => span.text).join(""))
    .join("\n");

export const buildBattleEventMessage = ({
  event,
  attacker,
  defender,
  translate,
}: {
  event: ParsedMove;
  attacker?: BattleWarrior;
  defender?: BattleWarrior;
  translate: (key: string) => string;
}) =>
  buildBattleMessage(event, {
    fighter: (id) =>
      [attacker, defender].find((warrior) => warrior?.originalId === id),
    text: (key) => translate(`battle.${key}`),
  });
