export type BattleWarriorSnapshot = {
  originalId: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
};

export type BattleEvent = {
  ev?: number;
  f?: {
    m?: string[];
    w?: Record<string, BattleWarriorSnapshot>;
  };
  match_summary?: {
    difficulty_rank: number;
    result: number;
    rating_delta: number;
    opponent_lvl: number;
    opponent_oplvl: number;
    opponent_rating: number;
    rating: number;
    status: number;
    placement_cur?: number;
    placement_max?: number;
    points_gained?: number;
    daily_stage?: {
      id: number;
      points_cur: number;
      points_max: number;
      points_step: number;
      rewards_last: number;
      rewards_cur: number;
      rewards_max: number;
    };
  };
};

export type BattlePayload = {
  accountId: string;
  characterId: string;
  world: string;
  events: BattleEvent[];
};

export type Warrior = {
  turns: number;
  turnsLost: number;
  steps: number;
  normalAttacks: number;
  spellsUsed: number;
  spellsUsedMap: Record<string, number>;
  originalId: string;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  team: number;
  isDead: boolean;
  surrendered: boolean;
  fled: boolean;
  maxHp: number;
  damageDealt: number;
  distanceDamage: number;
  meleeDamage: number;
  auxiliaryDamage: number;
  fireDamage: number;
  frostDamage: number;
  lightningDamage: number;
  thirdAttDamage: number;
  damageDealtAfterDefensive: number;
  damageDealtAfterDefensivePercentage: number;
  damageTaken: number;
  distanceDamageTaken: number;
  meleeDamageTaken: number;
  auxiliaryDamageTaken: number;
  fireDamageTaken: number;
  frostDamageTaken: number;
  lightningDamageTaken: number;
  thirdAttDamageTaken: number;
  flatDamageTaken: number;
  rageDamageDealt: number;
  trueDamageDealt: number;
  trueDamageTaken: number;
  stigmaDamageDealt: number;
  stigmaDamageTaken: number;
  passiveHealing: number;
  activeHealing: number;
  armorPierces: number;
  criticalHits: number;
  reducedArmor: number;
  reducedPoisonResistance: number;
  magicResistanceDestroyed: number;
  woundDamageTaken: number;
  poisonDamageTaken: number;
  injureDamageTaken: number;
  injures: number;
  critWoundDamageTaken: number;
  evasions: number;
  attacksEvaded: number;
  counters: number;
  fastArrows: number;
  firePassiveDamageTaken: number;
  lightningPassiveDamageTaken: number;
  destroyedEnergy: number;
  destroyedMana: number;
  blockedDamage: number;
  blocks: number;
  attacksBlocked: number;
  regeneratedEnergy: number;
  regeneratedMana: number;
  reflectedDamage: number;
  reflectedDamageTaken: number;
  legbons: number;
  legbonCurse: number;
  legbonCleanse: number;
  legbonLastheal: number;
  legbonLasthealValue: number;
  legbonGlare: number;
  legbonHolytouch: number;
  legbonHolytouchValue: number;
  legbonCritredValue: number;
  legbonFacadeValue: number;
  legbonVerycrit: number;
  legbonAnguish: number;
  legbonAnguishDamageTaken: number;
  legbonPunctureValue: number;
  ph: number;
};

export type ParsedMove = {
  attackerId: string | null;
  defenderId: string | null;
  attackerHpPercentage: number | null;
  defenderHpPercentage: number | null;
  actions: { actionType: string; param: string }[];
};

export type ParsedBattlePayload = {
  accountId: string;
  characterId: string;
  world: string;
  events: ParsedMove[];
  warriors: Record<string, BattleWarriorSnapshot>;
  duration?: number;
  matchmaking?: MatchmakingInfo;
};

export type BattleActionCategory =
  | "damage"
  | "healing"
  | "mitigation"
  | "counter"
  | "absorb"
  | "resource"
  | "control"
  | "buff"
  | "debuff"
  | "spell"
  | "combo"
  | "outcome"
  | "movement"
  | "legendary"
  | "system"
  | "unknown";

export type BattleTimelineAction = {
  actionType: string;
  param: string;
  category: BattleActionCategory;
  actorId: string | null;
  targetId: string | null;
  value: number;
  handled: boolean;
};

export type BattleTimelineWarriorDelta = {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
  mitigation: number;
  resourceDelta: number;
  resourcePressure: number;
  energyPressure: number;
  manaPressure: number;
  absorbGained: number;
  absorbSpent: number;
  magicAbsorbGained: number;
  magicAbsorbSpent: number;
  controlApplied: number;
  controlTaken: number;
};

export type BattleTimelineWarriorCumulative = {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
  mitigation: number;
  resourceDelta: number;
  resourcePressure: number;
  energyPressure: number;
  manaPressure: number;
  absorbGained: number;
  absorbSpent: number;
  magicAbsorbGained: number;
  magicAbsorbSpent: number;
  controlApplied: number;
  controlTaken: number;
};

export type BattleTimelineTurn = {
  turn: number;
  attackerId: string | null;
  defenderId: string | null;
  attackerHpPercentage: number | null;
  defenderHpPercentage: number | null;
  hpByWarrior: Record<string, number>;
  teamHp: Record<string, number>;
  teamHpDelta: Record<string, number>;
  deltas: {
    damage: number;
    healing: number;
    mitigation: number;
    resourcePressure: number;
    energyPressure: number;
    manaPressure: number;
    byWarrior: Record<string, BattleTimelineWarriorDelta>;
  };
  cumulative: Record<string, BattleTimelineWarriorCumulative>;
  actions: BattleTimelineAction[];
  flags: string[];
  labels: string[];
  significanceScore: number;
  reason: string;
};

export type WarriorMechanicsAggregate = {
  warriorId: string;
  name: string;
  team: number;
  absorptionGained: number;
  absorptionSpent: number;
  magicAbsorptionGained: number;
  magicAbsorptionSpent: number;
  auxiliaryDamageTaken: number;
  targetHealing: number;
  spells: Array<{
    key: string;
    name: string;
    skillId: number | null;
    casts: number;
  }>;
  maxCombo: number;
  controlApplied: number;
  controlTaken: number;
  mitigationEvents: number;
  effectDamageTaken: number;
  resourcePressure: number;
  energyPressure: number;
  manaPressure: number;
};

export type BattleActionCoverageEntry = {
  actionType: string;
  count: number;
  handled: boolean;
  category: BattleActionCategory;
};

export type BattleActionCoverage = {
  totalActions: number;
  handledActions: number;
  unhandledActions: number;
  handledPercentage: number;
  actions: BattleActionCoverageEntry[];
  unknown: BattleActionCoverageEntry[];
};

export type StatisticEntry = {
  warriorId: string;
  name: string;
  value: number;
  formattedValue?: string;
};

export type BattleStatistics = {
  topDamageDealer: StatisticEntry | null;
  topTank: StatisticEntry | null;
  bestEfficiency: StatisticEntry | null;
  criticalMaster: StatisticEntry | null;
  evasionExpert: StatisticEntry | null;
  shieldWall: StatisticEntry | null;
  damagePerTurn: StatisticEntry | null;
  mostActive: StatisticEntry | null;
  legendaryWarrior: StatisticEntry | null;
  untouchable: StatisticEntry | null;
};

export type MatchmakingInfo = {
  difficultyRank: number;
  result: number;
  ratingDelta: number;
  opponentLvl: number;
  opponentOplvl: number;
  opponentRating: number;
  rating: number;
  status: number;
  pointsGained?: number;
  placementCur?: number;
  placementMax?: number;
  dailyStageId?: number;
  dailyPointsCur?: number;
  dailyPointsMax?: number;
  dailyPointsStep?: number;
  dailyRewardsLast?: number;
  dailyRewardsCur?: number;
  dailyRewardsMax?: number;
};

export type BattleAnalysis = {
  duration: number;
  warriors: Warrior[];
  parsedMoves: ParsedMove[];
  outcome: {
    winner: string;
    loser: string;
    winningTeam: number | null;
    losingTeam: number | null;
    hasFlee: boolean;
  };
  type: string;
  statistics: BattleStatistics;
  battleTimeline: BattleTimelineTurn[];
  warriorMechanics: WarriorMechanicsAggregate[];
  actionCoverage: BattleActionCoverage;
  matchmaking?: MatchmakingInfo;
};

const DAMAGE_DEALT_ACTIONS: Record<string, keyof Warrior> = {
  "+dmgd": "distanceDamage",
  "+dmg": "meleeDamage",
  "+dmgo": "auxiliaryDamage",
  "+dmga": "auxiliaryDamage",
  "+dmgf": "fireDamage",
  "+dmgc": "frostDamage",
  "+dmgl": "lightningDamage",
  "+thirdatt": "thirdAttDamage",
};

const DAMAGE_TAKEN_ACTIONS: Record<string, keyof Warrior> = {
  "-dmgd": "distanceDamageTaken",
  "-dmg": "meleeDamageTaken",
  "-dmgo": "auxiliaryDamageTaken",
  "-dmga": "auxiliaryDamageTaken",
  "-dmgf": "fireDamageTaken",
  "-dmgc": "frostDamageTaken",
  "-dmgl": "lightningDamageTaken",
  "-thirdatt": "thirdAttDamageTaken",
};

const SPECIAL_DAMAGE_ACTIONS: Partial<
  Record<string, { targetTakesDamage: boolean }>
> = {
  "+rage": { targetTakesDamage: true },
  "+taken_dmg": { targetTakesDamage: true },
};

const PASSIVE_DAMAGE_ACTIONS = new Set([
  "wound",
  "critwound",
  "anguish",
  "poison",
  "injure",
  "fire",
  "light",
]);

const MITIGATION_ACTIONS = new Set([
  "-evade",
  "-blok",
  "-block",
  "-parry",
  "-arrowblock",
  "-pierceb",
  "active_decblock_per",
  "active_decblock_per-enemies",
  "alllowdmg",
]);
const COUNTER_ACTIONS = new Set(["-contra"]);

const ABSORB_GAIN_ACTIONS = new Set([
  "+absorb",
  "+abdest",
  "+abdest_per",
  "active_absorbdest_per",
]);

const MAGIC_ABSORB_GAIN_ACTIONS = new Set(["+absorbm", "+abmdest_per"]);
const ABSORB_SPEND_ACTIONS = new Set(["-absorb"]);
const MAGIC_ABSORB_SPEND_ACTIONS = new Set(["-absorbm"]);

const CONTROL_ACTIONS = new Set([
  "+stun",
  "stun",
  "+freeze",
  "freeze",
  "+slow",
  "+critslow_per",
  "+distract",
  "removestun-allies",
  "removeslow-allies",
]);

const RESOURCE_ACTIONS = new Set([
  "energy",
  "en-regen",
  "mana",
  "-endest",
  "-manadest",
  "+engback",
  "+energy",
  "energyout",
  "+endest",
  "stealmana",
]);

const HEALING_ACTIONS = new Set([
  "heal",
  "bandage",
  "heal_target",
  "healall_per",
  "lowheal_per-enemies",
  "achpp_per",
  "legbon_lastheal",
  "legbon_holytouch_heal",
]);

const SPELL_ACTIONS = new Set(["tspell", "skillId", "+oth_dmg"]);
const COMBO_ACTIONS = new Set(["combo", "combo-max"]);
const OUTCOME_ACTIONS = new Set(["winner", "loser", "flee", "+ph"]);
const MOVEMENT_ACTIONS = new Set(["step", "+swing"]);

const LEGENDARY_ACTIONS = new Set([
  "+legbon_curse",
  "-legbon_cleanse",
  "legbon_lastheal",
  "-legbon_glare",
  "+legbon_holytouch",
  "legbon_holytouch_heal",
  "-legbon_critred",
  "-legbon_facade",
  "+legbon_verycrit",
  "+legbon_anguish",
  "+legbon_puncture",
]);

const BUFF_ACTIONS = new Set([
  "+pierce",
  "+crit",
  "+fastarrow",
  "+injure",
  "+wound",
  "+woundpoison",
  "+of_crit",
  "+of_wound",
  "+critsa_per",
  "+critwound",
  "+crush_physical",
  "+crush_distance",
  "+critpierce",
  "+spell-taken_dmg-all",
  "aura-sa_per",
  "aura-adddmg2_per-meele",
  "critval-allies",
  "critmval-allies",
  "absolute",
  "+exp",
]);

const DEBUFF_ACTIONS = new Set([
  "+acdmg",
  "+actdmg",
  "+resdmg",
  "-redacdmg_per",
  "-redabdest_per",
  "-poison_lowdmg_per",
  "critwound",
]);

const SYSTEM_ACTIONS = new Set(["txt", "shout"]);

const DAMAGE_ACTIONS = new Set([
  ...Object.keys(DAMAGE_DEALT_ACTIONS),
  ...Object.keys(DAMAGE_TAKEN_ACTIONS),
  ...Object.keys(SPECIAL_DAMAGE_ACTIONS),
  ...PASSIVE_DAMAGE_ACTIONS,
]);
const ABSORB_ACTIONS = new Set([
  ...ABSORB_GAIN_ACTIONS,
  ...MAGIC_ABSORB_GAIN_ACTIONS,
  ...ABSORB_SPEND_ACTIONS,
  ...MAGIC_ABSORB_SPEND_ACTIONS,
]);
const ACTION_CATEGORY_SETS: ReadonlyArray<
  readonly [BattleActionCategory, ReadonlySet<string>]
> = [
  ["damage", DAMAGE_ACTIONS],
  ["healing", HEALING_ACTIONS],
  ["mitigation", MITIGATION_ACTIONS],
  ["counter", COUNTER_ACTIONS],
  ["absorb", ABSORB_ACTIONS],
  ["resource", RESOURCE_ACTIONS],
  ["control", CONTROL_ACTIONS],
  ["spell", SPELL_ACTIONS],
  ["combo", COMBO_ACTIONS],
  ["outcome", OUTCOME_ACTIONS],
  ["movement", MOVEMENT_ACTIONS],
  ["legendary", LEGENDARY_ACTIONS],
  ["buff", BUFF_ACTIONS],
  ["debuff", DEBUFF_ACTIONS],
  ["system", SYSTEM_ACTIONS],
];

type WarriorActionContext = {
  attacker: Warrior;
  defender: Warrior | null;
  value: number;
};

type DefenderActionContext = {
  attacker: Warrior;
  defender: Warrior;
  value: number;
};

type WarriorActionHandler = (context: WarriorActionContext) => void;
type DefenderActionHandler = (context: DefenderActionContext) => void;

type TeamOutcomeMetrics = {
  hpSum: Record<number, number>;
  alive: Record<number, number>;
  dmgDealt: Record<number, number>;
  dmgTaken: Record<number, number>;
};

type OutcomeTeams = {
  winningTeam: number | null;
  losingTeam: number | null;
};

type TimelineActionAnalysis = {
  actions: BattleTimelineAction[];
  byWarrior: Record<string, BattleTimelineWarriorDelta>;
  damage: number;
  healing: number;
  mitigation: number;
  resourcePressure: number;
  energyPressure: number;
  manaPressure: number;
  flags: string[];
  labels: string[];
};

type TimelineActionAccumulator = Omit<
  TimelineActionAnalysis,
  "flags" | "labels"
> & {
  flags: Set<string>;
  labels: Set<string>;
  hasActualDamage: boolean;
};

type TimelineActionContext = {
  actionType: string;
  param: string;
  value: number;
  actorId: string | null;
  targetId: string | null;
  handled: boolean;
};

const splitOutcomeNames = (value: string): string[] =>
  value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

const addTeamMetric = (
  metrics: Record<number, number>,
  team: number,
  value: number,
): void => {
  metrics[team] = (metrics[team] ?? 0) + value;
};

const incrementAttackerStat =
  (stat: keyof Warrior): WarriorActionHandler =>
  ({ attacker }) => {
    (attacker[stat] as number)++;
  };
const addToAttackerStat =
  (stat: keyof Warrior): WarriorActionHandler =>
  ({ attacker, value }) => {
    (attacker[stat] as number) += value;
  };
const addDamageTaken =
  (stat: keyof Warrior): WarriorActionHandler =>
  ({ attacker, value }) => {
    (attacker[stat] as number) += value;
    attacker.damageTaken += value;
  };

const ATTACKER_ACTION_HANDLERS: Record<string, WarriorActionHandler> = {
  "+rage": addToAttackerStat("rageDamageDealt"),
  "+taken_dmg": ({ attacker, defender, value }) => {
    attacker.stigmaDamageDealt += value;
    if (defender) defender.stigmaDamageTaken += value;
  },
  "+pierce": incrementAttackerStat("armorPierces"),
  "+crit": incrementAttackerStat("criticalHits"),
  heal: addToAttackerStat("passiveHealing"),
  bandage: addToAttackerStat("activeHealing"),
  heal_target: ({ defender, value }) => {
    if (defender) defender.activeHealing += value;
  },
  "+acdmg": addToAttackerStat("reducedArmor"),
  wound: addDamageTaken("woundDamageTaken"),
  critwound: addDamageTaken("critWoundDamageTaken"),
  anguish: addDamageTaken("legbonAnguishDamageTaken"),
  poison: addDamageTaken("poisonDamageTaken"),
  injure: addDamageTaken("injureDamageTaken"),
  "+injure": ({ defender }) => {
    if (defender) defender.injures++;
  },
  "+fastarrow": incrementAttackerStat("fastArrows"),
  fire: addDamageTaken("firePassiveDamageTaken"),
  light: addDamageTaken("lightningPassiveDamageTaken"),
  energy: ({ attacker, value }) => {
    attacker.regeneratedEnergy -= value;
  },
  "en-regen": addToAttackerStat("regeneratedEnergy"),
  "+energy": addToAttackerStat("regeneratedEnergy"),
  "+engback": addToAttackerStat("regeneratedEnergy"),
  "+legbon_curse": incrementAttackerStat("legbonCurse"),
  "+legbon_holytouch": incrementAttackerStat("legbonHolytouch"),
  legbon_holytouch_heal: addToAttackerStat("legbonHolytouchValue"),
  "+legbon_verycrit": incrementAttackerStat("legbonVerycrit"),
  "+legbon_anguish": incrementAttackerStat("legbonAnguish"),
  legbon_lastheal: ({ attacker, defender, value }) => {
    const healedWarrior = defender ?? attacker;
    healedWarrior.legbonLastheal++;
    healedWarrior.legbonLasthealValue += value;
  },
};

const incrementDefenderStat =
  (stat: keyof Warrior): DefenderActionHandler =>
  ({ defender }) => {
    (defender[stat] as number)++;
  };
const addToDefenderStat =
  (stat: keyof Warrior): DefenderActionHandler =>
  ({ defender, value }) => {
    (defender[stat] as number) += value;
  };
const blockAttack: DefenderActionHandler = ({ attacker, defender, value }) => {
  defender.blocks++;
  defender.blockedDamage += value;
  attacker.attacksBlocked++;
};

const DEFENDER_ACTION_HANDLERS: Record<string, DefenderActionHandler> = {
  "-evade": ({ attacker, defender }) => {
    defender.evasions++;
    attacker.attacksEvaded++;
  },
  "-contra": incrementDefenderStat("counters"),
  "-blok": blockAttack,
  "-block": blockAttack,
  "-parry": blockAttack,
  "-arrowblock": blockAttack,
  "-pierceb": blockAttack,
  "-endest": addToDefenderStat("destroyedEnergy"),
  "-manadest": addToDefenderStat("destroyedMana"),
  "en-regen": addToDefenderStat("regeneratedEnergy"),
  mana: ({ attacker, value }) => {
    attacker.regeneratedMana -= value;
  },
  stealmana: ({ attacker, defender, value }) => {
    defender.destroyedMana += value;
    attacker.regeneratedMana += value;
  },
  "-legbon_cleanse": incrementDefenderStat("legbonCleanse"),
  "-legbon_glare": incrementDefenderStat("legbonGlare"),
  "-legbon_critred": ({ defender, value }) => {
    defender.legbonCritredValue = value;
  },
  "-legbon_facade": ({ defender, value }) => {
    defender.legbonFacadeValue = value;
  },
  "+legbon_puncture": ({ attacker, value }) => {
    attacker.legbonPunctureValue = value;
  },
  "+resdmg": ({ attacker, value }) => {
    attacker.magicResistanceDestroyed += value;
  },
  "+actdmg": ({ attacker, value }) => {
    attacker.reducedPoisonResistance += value;
  },
};

const createEmptyTimelineStats = (): BattleTimelineWarriorDelta => ({
  damageDealt: 0,
  damageTaken: 0,
  healingDone: 0,
  healingReceived: 0,
  mitigation: 0,
  resourceDelta: 0,
  resourcePressure: 0,
  energyPressure: 0,
  manaPressure: 0,
  absorbGained: 0,
  absorbSpent: 0,
  magicAbsorbGained: 0,
  magicAbsorbSpent: 0,
  controlApplied: 0,
  controlTaken: 0,
});

const copyTimelineStats = (
  stats: BattleTimelineWarriorCumulative,
): BattleTimelineWarriorCumulative => ({ ...stats });

export class BattleProcessor {
  private readonly warriors = new Map<string, Warrior>();
  private readonly lastHp = new Map<string, number>();
  private readonly battleTimeline: BattleTimelineTurn[] = [];
  private readonly timelineHp = new Map<string, number>();
  private readonly timelineCumulative = new Map<
    string,
    BattleTimelineWarriorCumulative
  >();
  private readonly warriorMechanics = new Map<
    string,
    WarriorMechanicsAggregate
  >();
  private readonly actionCoverage = new Map<
    string,
    { count: number; handled: boolean; category: BattleActionCategory }
  >();
  private readonly battleOutcome = {
    winner: "",
    loser: "",
    winningTeam: null as number | null,
    losingTeam: null as number | null,
    hasFlee: false,
  };
  private battleType = "";
  private lastAttackerId: string | null = null;
  private remainingFollowUpAttacks = 0;

  processBattle(battleData: BattlePayload): BattleAnalysis {
    const duration = this.calculateBattleDuration(battleData.events);
    this.initializeBattleWarriors(battleData.events);
    this.initializeTimelineState();
    this.determineBattleType();
    const matchmakingInfo = this.getMatchmakingInfo(battleData.events);

    const moves = this.extractAndParseMoves(battleData.events);
    this.calculateBattleStats(moves, { characterId: battleData.characterId });
    this.determineOutcomeTeams();
    this.calculateDerivedStats();

    const statistics = this.calculateBattleStatistics();

    return {
      duration,
      warriors: Array.from(this.warriors.values()),
      parsedMoves: moves,
      outcome: this.battleOutcome,
      type: this.battleType,
      statistics,
      battleTimeline: this.battleTimeline,
      warriorMechanics: this.getWarriorMechanics(),
      actionCoverage: this.getActionCoverage(),
      matchmaking: matchmakingInfo,
    };
  }

  processParsedBattle(battleData: ParsedBattlePayload): BattleAnalysis {
    this.initializeWarriorsFromSnapshots(battleData.warriors);
    this.initializeTimelineState();
    this.determineBattleType();

    this.calculateBattleStats(battleData.events, {
      characterId: battleData.characterId,
    });
    this.determineOutcomeTeams();
    this.calculateDerivedStats();

    const statistics = this.calculateBattleStatistics();

    return {
      duration: battleData.duration ?? 0,
      warriors: Array.from(this.warriors.values()),
      parsedMoves: battleData.events,
      outcome: this.battleOutcome,
      type: this.battleType,
      statistics,
      battleTimeline: this.battleTimeline,
      warriorMechanics: this.getWarriorMechanics(),
      actionCoverage: this.getActionCoverage(),
      matchmaking: battleData.matchmaking,
    };
  }

  public extractAndParseMoves(events: BattlePayload["events"]): ParsedMove[] {
    const allMoves = events.flatMap((event) => event.f?.m ?? []);

    return allMoves.map((move) => {
      const [attackerPart, defenderPart, ...actions] = move.split(";");
      const [attackerId = "0", attackerHp] = (attackerPart ?? "0").split("=");
      const [defenderId = "0", defenderHp] = (defenderPart ?? "0").split("=");

      return {
        attackerId: attackerId !== "0" ? attackerId : null,
        defenderId: defenderId !== "0" ? defenderId : null,
        attackerHpPercentage: attackerHp
          ? Number.parseFloat(attackerHp.replace(",", "."))
          : null,
        defenderHpPercentage: defenderHp
          ? Number.parseFloat(defenderHp.replace(",", "."))
          : null,
        actions: actions.map((action) => {
          const [actionType = "", param = ""] = action.split("=");
          return { actionType, param };
        }),
      };
    });
  }

  private calculateBattleStats(
    moves: ParsedMove[],
    battleMeta: { characterId: string },
  ) {
    for (const [moveIndex, move] of moves.entries()) {
      const teamHpBefore = this.calculateTeamHp();

      this.processOutcome(move);

      if (!move.actions.length) {
        this.updateHpTracking(move);
        this.recordTimelineTurn(moveIndex, move, teamHpBefore);
        continue;
      }

      const tspellAction = move.actions.find((a) => a.actionType === "tspell");
      const skillIdAction = move.actions.find(
        (a) => a.actionType === "skillId",
      );
      const hasStepAction = move.actions.some((a) => a.actionType === "step");

      if (hasStepAction && move.attackerId) {
        const attacker = this.warriors.get(move.attackerId);
        if (attacker) {
          attacker.turns++;
          attacker.steps++;
        }
      }

      this.processTurnTracking(move, tspellAction, skillIdAction);
      this.processActions(move, !!tspellAction, battleMeta);
      this.updateHpTracking(move);
      this.recordTimelineTurn(moveIndex, move, teamHpBefore);
    }
  }

  private processTurnTracking(
    move: ParsedMove,
    tspellAction?: { actionType: string; param: string },
    skillIdAction?: { actionType: string; param: string },
  ) {
    if (tspellAction) {
      if (move.attackerId && move.defenderId) {
        const attacker = this.warriors.get(move.attackerId);
        if (attacker) {
          attacker.turns++;
          attacker.spellsUsed++;
          const spellName = tspellAction.param || "unknown";
          attacker.spellsUsedMap[spellName] =
            (attacker.spellsUsedMap[spellName] ?? 0) + 1;
        }
      }

      const skillIdParam = skillIdAction?.param ?? tspellAction.param;
      const skillId = skillIdParam ? Number.parseInt(skillIdParam, 10) : 0;
      this.trackSpellMechanics(move, tspellAction.param, skillId);
      this.remainingFollowUpAttacks = skillId === 97 || skillId === 239 ? 2 : 1;
      this.lastAttackerId = move.attackerId;
    } else {
      if (
        this.remainingFollowUpAttacks > 0 &&
        move.attackerId === this.lastAttackerId
      ) {
        this.remainingFollowUpAttacks--;
      } else {
        if (move.attackerId && move.defenderId) {
          const attacker = this.warriors.get(move.attackerId);
          if (attacker) {
            attacker.turns++;
            attacker.normalAttacks++;
          }
        }
        this.remainingFollowUpAttacks = 0;
      }
      this.lastAttackerId = move.attackerId;
    }
  }

  private updateHpTracking(move: ParsedMove) {
    if (move.attackerId && move.attackerHpPercentage !== null) {
      const attacker = this.warriors.get(move.attackerId);
      if (attacker && move.attackerHpPercentage <= 0) {
        attacker.isDead = true;
      }
      this.lastHp.set(move.attackerId, move.attackerHpPercentage);
    }
    if (move.defenderId && move.defenderHpPercentage !== null) {
      const defender = this.warriors.get(move.defenderId);
      if (defender && move.defenderHpPercentage <= 0) {
        defender.isDead = true;
      }
      this.lastHp.set(move.defenderId, move.defenderHpPercentage);
    }
  }

  private recordTimelineTurn(
    moveIndex: number,
    move: ParsedMove,
    teamHpBefore: Record<string, number>,
  ): void {
    const analyzed = this.analyzeTimelineActions(move);
    this.updateTimelineHp(move);

    const hpByWarrior = this.getHpByWarrior();
    const teamHp = this.calculateTeamHp();
    const teamHpDelta = this.calculateTeamHpDelta(teamHpBefore, teamHp);
    const flags = new Set(analyzed.flags);
    const labels = new Set(analyzed.labels);

    for (const [warriorId, hp] of Object.entries(hpByWarrior)) {
      if (hp <= 0) {
        flags.add("kill");
        labels.add(`kill:${warriorId}`);
      }
    }

    this.applyTimelineCumulative(analyzed.byWarrior);

    const cumulative = Array.from(this.timelineCumulative.entries()).reduce<
      Record<string, BattleTimelineWarriorCumulative>
    >((acc, [warriorId, stats]) => {
      acc[warriorId] = copyTimelineStats(stats);
      return acc;
    }, {});

    const turn: BattleTimelineTurn = {
      turn: moveIndex + 1,
      attackerId: move.attackerId,
      defenderId: move.defenderId,
      attackerHpPercentage: move.attackerHpPercentage,
      defenderHpPercentage: move.defenderHpPercentage,
      hpByWarrior,
      teamHp,
      teamHpDelta,
      deltas: {
        damage: analyzed.damage,
        healing: analyzed.healing,
        mitigation: analyzed.mitigation,
        resourcePressure: analyzed.resourcePressure,
        energyPressure: analyzed.energyPressure,
        manaPressure: analyzed.manaPressure,
        byWarrior: analyzed.byWarrior,
      },
      cumulative,
      actions: analyzed.actions,
      flags: Array.from(flags),
      labels: Array.from(labels),
      significanceScore: this.calculateSignificanceScore({
        damage: analyzed.damage,
        healing: analyzed.healing,
        mitigation: analyzed.mitigation,
        resourcePressure: analyzed.resourcePressure,
        flags,
        teamHpDelta,
      }),
      reason: this.getTimelineReason({
        damage: analyzed.damage,
        healing: analyzed.healing,
        mitigation: analyzed.mitigation,
        resourcePressure: analyzed.resourcePressure,
        flags,
      }),
    };

    this.battleTimeline.push(turn);
  }

  private analyzeTimelineActions(move: ParsedMove): TimelineActionAnalysis {
    const accumulator: TimelineActionAccumulator = {
      actions: [],
      byWarrior: {},
      damage: 0,
      healing: 0,
      mitigation: 0,
      resourcePressure: 0,
      energyPressure: 0,
      manaPressure: 0,
      flags: new Set<string>(),
      labels: new Set<string>(),
      hasActualDamage: move.actions.some(
        (action) => DAMAGE_TAKEN_ACTIONS[action.actionType],
      ),
    };

    for (const { actionType, param } of move.actions) {
      const category = this.getActionCategory(actionType);
      const handled = category !== "unknown";
      const value = this.parseActionValue(param);
      const context: TimelineActionContext = {
        actionType,
        param,
        value,
        actorId: move.attackerId,
        targetId: move.defenderId,
        handled,
      };

      this.recordActionCoverage(actionType, category, handled);
      accumulator.actions.push({
        actionType,
        param,
        category,
        actorId: context.actorId,
        targetId: context.targetId,
        value,
        handled,
      });
      this.processTimelineAction(context, accumulator);
    }

    return {
      actions: accumulator.actions,
      byWarrior: accumulator.byWarrior,
      damage: accumulator.damage,
      healing: accumulator.healing,
      mitigation: accumulator.mitigation,
      resourcePressure: accumulator.resourcePressure,
      energyPressure: accumulator.energyPressure,
      manaPressure: accumulator.manaPressure,
      flags: Array.from(accumulator.flags),
      labels: Array.from(accumulator.labels),
    };
  }

  private processTimelineAction(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): void {
    if (this.processTimelineDamage(context, accumulator)) return;
    if (this.processTimelineHealing(context, accumulator)) return;
    if (this.processTimelineMitigation(context, accumulator)) return;
    if (this.processTimelineCounter(context, accumulator)) return;
    if (this.processTimelineAbsorb(context, accumulator)) return;
    if (this.processTimelineControl(context, accumulator)) return;
    if (this.processTimelineResource(context, accumulator)) return;
    if (this.processTimelineOtherDamage(context, accumulator)) return;
    if (this.processTimelineCombo(context, accumulator)) return;
    if (this.processTimelineOutcomeMarker(context, accumulator)) return;

    if (context.actionType === "txt" && context.param.includes("utrata tury")) {
      accumulator.flags.add("stun");
    }
    if (context.handled) accumulator.labels.add(context.actionType);
  }

  private processTimelineDamage(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (this.processTimelineDamageDealt(context, accumulator)) return true;
    if (this.processTimelineDamageTaken(context, accumulator)) return true;
    if (this.processTimelineSpecialDamage(context, accumulator)) return true;
    return this.processTimelinePassiveDamage(context, accumulator);
  }

  private processTimelineDamageDealt(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!DAMAGE_DEALT_ACTIONS[context.actionType]) return false;
    if (!accumulator.hasActualDamage && context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "damageDealt",
        context.value,
      );
      accumulator.damage += context.value;
    }
    accumulator.flags.add("damage");
    return true;
  }

  private processTimelineDamageTaken(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!DAMAGE_TAKEN_ACTIONS[context.actionType]) return false;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "damageDealt",
        context.value,
      );
    }
    if (context.targetId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.targetId,
        "damageTaken",
        context.value,
      );
      if (context.actionType === "-dmga" || context.actionType === "-dmgo") {
        this.trackAuxiliaryDamageTaken(context.targetId, context.value);
      }
    }
    accumulator.damage += context.value;
    accumulator.flags.add("damage");
    return true;
  }

  private processTimelineSpecialDamage(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    const action = SPECIAL_DAMAGE_ACTIONS[context.actionType];
    if (!action) return false;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "damageDealt",
        context.value,
      );
    }
    if (context.targetId && action.targetTakesDamage) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.targetId,
        "damageTaken",
        context.value,
      );
    }
    accumulator.damage += context.value;
    accumulator.flags.add("damage");
    return true;
  }

  private processTimelinePassiveDamage(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!PASSIVE_DAMAGE_ACTIONS.has(context.actionType)) return false;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "damageTaken",
        context.value,
      );
      this.trackEffectDamage(context.actorId, context.value);
    }
    accumulator.damage += context.value;
    accumulator.flags.add("effectDamage");
    return true;
  }

  private processTimelineHealing(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!HEALING_ACTIONS.has(context.actionType)) return false;
    const healsTarget =
      context.actionType === "heal_target" ||
      context.actionType === "legbon_lastheal";
    const healedWarriorId = healsTarget
      ? (context.targetId ?? context.actorId)
      : context.actorId;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "healingDone",
        context.value,
      );
      if (context.actionType === "heal_target") {
        this.trackTargetHealing(context.actorId, context.value);
      }
    }
    if (healedWarriorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        healedWarriorId,
        "healingReceived",
        context.value,
      );
    }
    accumulator.healing += context.value;
    accumulator.flags.add("healing");
    return true;
  }

  private processTimelineMitigation(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!MITIGATION_ACTIONS.has(context.actionType)) return false;
    const defenderId = context.targetId ?? context.actorId;
    if (defenderId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        defenderId,
        "mitigation",
        context.value,
      );
      this.trackMitigationEvent(defenderId);
    }
    accumulator.mitigation += context.value;
    accumulator.flags.add(this.getMitigationFlag(context.actionType));
    return true;
  }

  private processTimelineCounter(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!COUNTER_ACTIONS.has(context.actionType)) return false;
    accumulator.flags.add("counter");
    return true;
  }

  private processTimelineAbsorb(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (ABSORB_GAIN_ACTIONS.has(context.actionType)) {
      this.applyTimelineAbsorb(
        context.actorId ?? context.targetId,
        context.value,
        "absorbGained",
        "absorptionGained",
        accumulator,
      );
      return true;
    }
    if (MAGIC_ABSORB_GAIN_ACTIONS.has(context.actionType)) {
      this.applyTimelineAbsorb(
        context.actorId ?? context.targetId,
        context.value,
        "magicAbsorbGained",
        "magicAbsorptionGained",
        accumulator,
      );
      return true;
    }
    if (ABSORB_SPEND_ACTIONS.has(context.actionType)) {
      this.applyTimelineAbsorb(
        context.targetId ?? context.actorId,
        context.value,
        "absorbSpent",
        "absorptionSpent",
        accumulator,
      );
      accumulator.mitigation += context.value;
      return true;
    }
    if (MAGIC_ABSORB_SPEND_ACTIONS.has(context.actionType)) {
      this.applyTimelineAbsorb(
        context.targetId ?? context.actorId,
        context.value,
        "magicAbsorbSpent",
        "magicAbsorptionSpent",
        accumulator,
      );
      accumulator.mitigation += context.value;
      return true;
    }
    return false;
  }

  private applyTimelineAbsorb(
    warriorId: string | null,
    value: number,
    deltaField:
      | "absorbGained"
      | "magicAbsorbGained"
      | "absorbSpent"
      | "magicAbsorbSpent",
    mechanicsField:
      | "absorptionGained"
      | "magicAbsorptionGained"
      | "absorptionSpent"
      | "magicAbsorptionSpent",
    accumulator: TimelineActionAccumulator,
  ): void {
    if (warriorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        warriorId,
        deltaField,
        value,
      );
      this.trackAbsorb(warriorId, mechanicsField, value);
    }
    accumulator.flags.add("absorb");
  }

  private processTimelineControl(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!CONTROL_ACTIONS.has(context.actionType)) return false;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "controlApplied",
        1,
      );
      this.trackControl(context.actorId, "controlApplied");
    }
    if (context.targetId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.targetId,
        "controlTaken",
        1,
      );
      this.trackControl(context.targetId, "controlTaken");
    }
    accumulator.flags.add(
      context.actionType.includes("freeze") ? "freeze" : "stun",
    );
    return true;
  }

  private processTimelineResource(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!RESOURCE_ACTIONS.has(context.actionType)) return false;

    const appliesPressure = this.isResourcePressureAction(context.actionType);
    const resourceTargetId = appliesPressure
      ? context.targetId
      : context.actorId;
    if (context.actorId && appliesPressure) {
      this.applyTimelineResourcePressure(
        context.actorId,
        context.actionType,
        context.value,
        accumulator,
      );
    }
    if (resourceTargetId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        resourceTargetId,
        "resourceDelta",
        this.getResourceDirection(context.actionType, context.value),
      );
    }
    accumulator.flags.add("resource");
    return true;
  }

  private applyTimelineResourcePressure(
    actorId: string,
    actionType: TimelineActionContext["actionType"],
    value: number,
    accumulator: TimelineActionAccumulator,
  ): void {
    this.addTimelineDelta(
      accumulator.byWarrior,
      actorId,
      "resourcePressure",
      value,
    );
    const pressureField = this.getResourcePressureField(actionType);
    if (pressureField) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        actorId,
        pressureField,
        value,
      );
    }
    this.trackResourcePressure(actorId, actionType, value);
    accumulator.resourcePressure += value;
    if (pressureField === "energyPressure") {
      accumulator.energyPressure += value;
    } else if (pressureField === "manaPressure") {
      accumulator.manaPressure += value;
    }
  }

  private isResourcePressureAction(actionType: string): boolean {
    return actionType.startsWith("-") || actionType === "stealmana";
  }

  private getResourceDirection(actionType: string, value: number): number {
    const restoresResource =
      actionType === "en-regen" ||
      actionType === "+energy" ||
      actionType === "+engback";
    return restoresResource ? value : -value;
  }

  private processTimelineOtherDamage(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (context.actionType !== "+oth_dmg") return false;
    const effectiveTargetId =
      this.getTargetIdFromActionParam(context.param) ?? context.targetId;
    if (context.actorId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        context.actorId,
        "damageDealt",
        context.value,
      );
    }
    if (effectiveTargetId) {
      this.addTimelineDelta(
        accumulator.byWarrior,
        effectiveTargetId,
        "damageTaken",
        context.value,
      );
    }
    accumulator.damage += context.value;
    accumulator.flags.add("damage");
    return true;
  }

  private processTimelineCombo(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (!COMBO_ACTIONS.has(context.actionType)) return false;
    if (context.actionType === "combo-max" && context.actorId) {
      this.trackComboMax(context.actorId, context.value);
    }
    accumulator.flags.add("combo");
    return true;
  }

  private processTimelineOutcomeMarker(
    context: TimelineActionContext,
    accumulator: TimelineActionAccumulator,
  ): boolean {
    if (context.actionType === "+ph") {
      accumulator.flags.add("ph");
      return true;
    }
    if (context.actionType === "flee") {
      accumulator.flags.add("flee");
      return true;
    }
    return false;
  }

  private addTimelineDelta(
    byWarrior: Record<string, BattleTimelineWarriorDelta>,
    warriorId: string,
    field: keyof BattleTimelineWarriorDelta,
    value: number,
  ): void {
    if (!byWarrior[warriorId]) {
      byWarrior[warriorId] = createEmptyTimelineStats();
    }

    byWarrior[warriorId][field] += value;
  }

  private applyTimelineCumulative(
    byWarrior: Record<string, BattleTimelineWarriorDelta>,
  ): void {
    for (const [warriorId, delta] of Object.entries(byWarrior)) {
      const cumulative =
        this.timelineCumulative.get(warriorId) ?? createEmptyTimelineStats();

      for (const [field, value] of Object.entries(delta) as Array<
        [keyof BattleTimelineWarriorDelta, number]
      >) {
        cumulative[field] += value;
      }

      this.timelineCumulative.set(warriorId, cumulative);
    }
  }

  private updateTimelineHp(move: ParsedMove): void {
    if (move.attackerId && move.attackerHpPercentage !== null) {
      this.timelineHp.set(move.attackerId, move.attackerHpPercentage);
    }

    if (move.defenderId && move.defenderHpPercentage !== null) {
      this.timelineHp.set(move.defenderId, move.defenderHpPercentage);
    }
  }

  private getHpByWarrior(): Record<string, number> {
    return Array.from(this.warriors.keys()).reduce<Record<string, number>>(
      (acc, warriorId) => {
        acc[warriorId] = this.timelineHp.get(warriorId) ?? 100;
        return acc;
      },
      {},
    );
  }

  private calculateTeamHp(): Record<string, number> {
    const teamHp = new Map<number, { total: number; count: number }>();

    for (const [warriorId, warrior] of this.warriors.entries()) {
      const hp = this.timelineHp.get(warriorId) ?? 100;
      const entry = teamHp.get(warrior.team) ?? { total: 0, count: 0 };
      entry.total += hp;
      entry.count++;
      teamHp.set(warrior.team, entry);
    }

    return Array.from(teamHp.entries()).reduce<Record<string, number>>(
      (acc, [team, entry]) => {
        acc[String(team)] =
          entry.count > 0
            ? Math.round((entry.total / entry.count) * 100) / 100
            : 0;
        return acc;
      },
      {},
    );
  }

  private calculateTeamHpDelta(
    previous: Record<string, number>,
    current: Record<string, number>,
  ): Record<string, number> {
    return Object.entries(current).reduce<Record<string, number>>(
      (acc, [team, hp]) => {
        acc[team] = Math.round((hp - (previous[team] ?? hp)) * 100) / 100;
        return acc;
      },
      {},
    );
  }

  private calculateSignificanceScore(params: {
    damage: number;
    healing: number;
    mitigation: number;
    resourcePressure: number;
    flags: Set<string>;
    teamHpDelta: Record<string, number>;
  }): number {
    let score = 0;

    score += Math.min(40, Math.round(params.damage / 100));
    score += Math.min(20, Math.round(params.healing / 150));
    score += Math.min(20, Math.round(params.mitigation / 150));
    score += Math.min(10, Math.round(params.resourcePressure / 100));

    if (params.flags.has("kill")) score += 50;
    if (params.flags.has("flee")) score += 40;
    if (params.flags.has("stun") || params.flags.has("freeze")) score += 20;
    if (params.flags.has("absorb")) score += 12;
    if (params.flags.has("ph")) score += 10;

    const biggestTeamSwing = Math.max(
      0,
      ...Object.values(params.teamHpDelta).map((value) => Math.abs(value)),
    );
    score += Math.min(20, Math.round(biggestTeamSwing));

    return Math.min(100, score);
  }

  private getTimelineReason(params: {
    damage: number;
    healing: number;
    mitigation: number;
    resourcePressure: number;
    flags: Set<string>;
  }): string {
    if (params.flags.has("kill")) return "kill";
    if (params.flags.has("flee")) return "flee";
    if (params.flags.has("freeze")) return "freeze";
    if (params.flags.has("stun")) return "control";
    if (params.healing >= 500) return "bigHealing";
    if (params.mitigation >= 500 || params.flags.has("absorb")) {
      return "mitigation";
    }
    if (params.damage >= 1000) return "bigDamage";
    if (params.resourcePressure > 0) return "resourcePressure";
    if (params.flags.has("combo")) return "combo";
    if (params.flags.has("ph")) return "ph";
    return "tempo";
  }

  private processActions(
    move: ParsedMove,
    hasSpell: boolean,
    battleMeta: { characterId: string },
  ) {
    const attacker = this.getWarriorOrNull(move.attackerId);
    const defender = this.getWarriorOrNull(move.defenderId);
    let defenderTakenDamage = 0;

    for (const { actionType, param } of move.actions) {
      if (this.processOutcomeAction(actionType, param)) {
        continue;
      }
      if (actionType === "+ph") {
        const warrior = this.warriors.get(battleMeta.characterId);
        if (warrior) warrior.ph = +param;
      }

      if (actionType === "txt") {
        this.processTextAction(param);
        continue;
      }

      if (!attacker) continue;

      const value = this.parseActionValue(param);
      if (DAMAGE_DEALT_ACTIONS[actionType]) {
        attacker.damageDealt += value;
        (attacker[DAMAGE_DEALT_ACTIONS[actionType]] as number) += value;
        continue;
      }

      if (DAMAGE_TAKEN_ACTIONS[actionType]) {
        attacker.damageDealtAfterDefensive += value;
        if (defender && move.defenderId) {
          defender.damageTaken += value;
          (defender[DAMAGE_TAKEN_ACTIONS[actionType]] as number) += value;
          defender.flatDamageTaken += value;
          defenderTakenDamage += value;
        }
        continue;
      }

      const handledSpecialAction = this.processSpecialWarriorAction({
        actionType,
        param,
        value,
        hasSpell,
        attacker,
        defender,
        attackerId: move.attackerId,
      });
      if (!handledSpecialAction) {
        ATTACKER_ACTION_HANDLERS[actionType]?.({ attacker, defender, value });
      }

      if (!defender) continue;
      DEFENDER_ACTION_HANDLERS[actionType]?.({ attacker, defender, value });
    }

    if (defender && move.defenderId && defenderTakenDamage > 0) {
      this.tryCalculateMaxHp(
        move.defenderId,
        defenderTakenDamage,
        move.defenderHpPercentage,
      );
    }
  }

  private getWarriorOrNull(warriorId: string | null): Warrior | null {
    return warriorId ? (this.warriors.get(warriorId) ?? null) : null;
  }

  private processOutcomeAction(actionType: string, param: string): boolean {
    if (actionType === "winner") {
      this.battleOutcome.winner = param;
      return true;
    }
    if (actionType === "loser") {
      this.battleOutcome.loser = param;
      return true;
    }
    return false;
  }

  private processTextAction(param: string): void {
    if (param.includes("utrata tury")) {
      const warriorName = param.split(" - ")[0]?.trim();
      const warrior = warriorName ? this.findWarrior(warriorName) : null;
      if (warrior) {
        warrior.turns++;
        warrior.turnsLost++;
      }
      return;
    }

    if (param.includes("poddał walkę")) {
      const warriorName = param.split(" poddał walkę")[0]?.trim();
      const warrior = warriorName ? this.findWarrior(warriorName) : null;
      if (warrior) warrior.surrendered = true;
    }
  }

  private processSpecialWarriorAction(context: {
    actionType: string;
    param: string;
    value: number;
    hasSpell: boolean;
    attacker: Warrior;
    defender: Warrior | null;
    attackerId: string | null;
  }): boolean {
    if (context.actionType === "+oth_dmg") {
      if (context.hasSpell) {
        this.handleSpellTrueDamage(
          context.attacker,
          context.param,
          context.value,
          context.defender,
        );
      } else {
        this.handleReflectedDamage(
          context.attacker,
          context.defender,
          context.value,
        );
      }
      return true;
    }

    if (context.actionType === "flee") {
      context.attacker.fled = true;
      this.battleOutcome.hasFlee = true;
      return true;
    }

    if (context.actionType === "combo-max") {
      if (context.attackerId) {
        this.trackComboMax(context.attackerId, context.value);
      }
      return true;
    }

    return false;
  }

  private handleSpellTrueDamage(
    attacker: Warrior,
    param: string,
    damage: number,
    defender: Warrior | null,
  ): void {
    attacker.damageDealt += damage;
    attacker.trueDamageDealt += damage;

    const parts = param.split(",");
    if (parts.length >= 3) {
      const targetNameWithHp = parts[2]?.trim();
      if (!targetNameWithHp) {
        return;
      }

      const hpMatch = targetNameWithHp.match(/\((\d+)%\)$/);
      const targetHp = hpMatch?.[1] ? Number.parseInt(hpMatch[1], 10) : null;
      const [targetNamePart = ""] = targetNameWithHp.split("(");
      const targetName = targetNamePart.trim();

      const found = this.findWarrior(targetName, true);
      if (found) {
        const [targetWarriorId, targetWarrior] = found;
        targetWarrior.damageTaken += damage;
        targetWarrior.trueDamageTaken += damage;
        if (targetHp !== null) {
          this.tryCalculateMaxHp(targetWarriorId, damage, targetHp);
        }
      }
    } else if (defender) {
      defender.damageTaken += damage;
      defender.trueDamageTaken += damage;
    }
  }

  private handleReflectedDamage(
    attacker: Warrior,
    defender: Warrior | null,
    damage: number,
  ): void {
    attacker.damageTaken += damage;
    attacker.trueDamageTaken += damage;
    attacker.reflectedDamageTaken += damage;
    if (defender) defender.reflectedDamage += damage;
  }

  private initializeBattleWarriors(events: BattlePayload["events"]): void {
    for (const event of events) {
      if (!event.f?.w) continue;
      for (const [id, warriorData] of Object.entries(event.f.w)) {
        if (!this.warriors.has(id)) {
          this.warriors.set(id, this.createWarrior(warriorData));
        }
      }
    }
  }

  private initializeWarriorsFromSnapshots(
    warriors: Record<string, BattleWarriorSnapshot>,
  ): void {
    for (const [id, warriorData] of Object.entries(warriors)) {
      if (!this.warriors.has(id)) {
        this.warriors.set(id, this.createWarrior(warriorData));
      }
    }
  }

  private initializeTimelineState(): void {
    for (const [id, warrior] of this.warriors.entries()) {
      this.lastHp.set(id, 100);
      this.timelineHp.set(id, 100);
      this.timelineCumulative.set(id, createEmptyTimelineStats());
      this.warriorMechanics.set(id, {
        warriorId: warrior.originalId,
        name: warrior.name,
        team: warrior.team,
        absorptionGained: 0,
        absorptionSpent: 0,
        magicAbsorptionGained: 0,
        magicAbsorptionSpent: 0,
        auxiliaryDamageTaken: 0,
        targetHealing: 0,
        spells: [],
        maxCombo: 0,
        controlApplied: 0,
        controlTaken: 0,
        mitigationEvents: 0,
        effectDamageTaken: 0,
        resourcePressure: 0,
        energyPressure: 0,
        manaPressure: 0,
      });
    }
  }

  private getActionCategory(actionType: string): BattleActionCategory {
    return (
      ACTION_CATEGORY_SETS.find(([, actions]) =>
        actions.has(actionType),
      )?.[0] ?? "unknown"
    );
  }

  private recordActionCoverage(
    actionType: string,
    category: BattleActionCategory,
    handled: boolean,
  ): void {
    const current = this.actionCoverage.get(actionType) ?? {
      count: 0,
      handled,
      category,
    };

    current.count++;
    current.handled = current.handled || handled;
    current.category =
      current.category === "unknown" ? category : current.category;
    this.actionCoverage.set(actionType, current);
  }

  private parseActionValue(param: string): number {
    const [firstParam = ""] = param.split(",");
    const value = Number.parseInt(firstParam, 10);
    return Number.isNaN(value) ? 0 : Math.abs(value);
  }

  private getMitigationFlag(actionType: string): string {
    if (actionType === "-evade") return "evade";
    if (actionType === "-parry") return "parry";
    if (actionType === "-arrowblock") return "arrowBlock";
    if (actionType === "-pierceb") return "pierceBlock";
    return "block";
  }

  private getTargetIdFromActionParam(param: string): string | null {
    const parts = param.split(",");
    const targetNameWithHp = parts[2]?.trim();
    if (!targetNameWithHp) {
      return null;
    }

    const [targetNamePart = ""] = targetNameWithHp.split("(");
    const targetName = targetNamePart.trim();
    const found = targetName ? this.findWarrior(targetName, true) : null;
    return found?.[0] ?? null;
  }

  private trackSpellMechanics(
    move: ParsedMove,
    spellName: string,
    skillId: number,
  ): void {
    if (!move.attackerId) {
      return;
    }

    const mechanics = this.warriorMechanics.get(move.attackerId);
    if (!mechanics) {
      return;
    }

    const normalizedSkillId = Number.isNaN(skillId) ? null : skillId;
    const normalizedName = spellName || "unknown";
    const key = `${normalizedSkillId ?? "unknown"}:${normalizedName}`;
    const currentSpell = mechanics.spells.find((spell) => spell.key === key);

    if (currentSpell) {
      currentSpell.casts++;
      return;
    }

    mechanics.spells.push({
      key,
      name: normalizedName,
      skillId: normalizedSkillId,
      casts: 1,
    });
  }

  private trackComboMax(warriorId: string, value: number): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.maxCombo = Math.max(mechanics.maxCombo, value);
  }

  private trackTargetHealing(warriorId: string, value: number): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.targetHealing += value;
  }

  private trackAuxiliaryDamageTaken(warriorId: string, value: number): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.auxiliaryDamageTaken += value;
  }

  private trackMitigationEvent(warriorId: string): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.mitigationEvents++;
  }

  private trackAbsorb(
    warriorId: string,
    field:
      | "absorptionGained"
      | "absorptionSpent"
      | "magicAbsorptionGained"
      | "magicAbsorptionSpent",
    value: number,
  ): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics[field] += value;
  }

  private trackControl(
    warriorId: string,
    field: "controlApplied" | "controlTaken",
  ): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics[field]++;
  }

  private trackEffectDamage(warriorId: string, value: number): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.effectDamageTaken += value;
  }

  private getResourcePressureField(
    actionType: string,
  ): "energyPressure" | "manaPressure" | null {
    if (actionType === "-endest") {
      return "energyPressure";
    }

    if (actionType === "-manadest" || actionType === "stealmana") {
      return "manaPressure";
    }

    return null;
  }

  private trackResourcePressure(
    warriorId: string,
    actionType: string,
    value: number,
  ): void {
    const mechanics = this.warriorMechanics.get(warriorId);
    if (!mechanics) {
      return;
    }

    mechanics.resourcePressure += value;
    const pressureField = this.getResourcePressureField(actionType);
    if (pressureField) {
      mechanics[pressureField] += value;
    }
  }

  private getWarriorMechanics(): WarriorMechanicsAggregate[] {
    return Array.from(this.warriorMechanics.values()).map((mechanics) => ({
      ...mechanics,
      spells: [...mechanics.spells].sort((a, b) => b.casts - a.casts),
    }));
  }

  private getActionCoverage(): BattleActionCoverage {
    const actions = Array.from(this.actionCoverage.entries())
      .map<BattleActionCoverageEntry>(([actionType, entry]) => ({
        actionType,
        count: entry.count,
        handled: entry.handled,
        category: entry.category,
      }))
      .sort((a, b) => b.count - a.count);

    const totalActions = actions.reduce((sum, action) => sum + action.count, 0);
    const handledActions = actions.reduce(
      (sum, action) => sum + (action.handled ? action.count : 0),
      0,
    );
    const unhandledActions = totalActions - handledActions;

    return {
      totalActions,
      handledActions,
      unhandledActions,
      handledPercentage:
        totalActions > 0
          ? Math.round((handledActions / totalActions) * 10000) / 100
          : 100,
      actions,
      unknown: actions.filter((action) => !action.handled),
    };
  }

  private createWarrior(data: BattleWarriorSnapshot): Warrior {
    return {
      turns: 0,
      turnsLost: 0,
      steps: 0,
      normalAttacks: 0,
      spellsUsed: 0,
      spellsUsedMap: {},
      originalId: data.originalId.toString(),
      name: data.name,
      lvl: data.lvl,
      prof: data.prof,
      icon: data.icon,
      team: data.team,
      isDead: false,
      surrendered: false,
      fled: false,
      maxHp: 0,
      damageDealt: 0,
      distanceDamage: 0,
      meleeDamage: 0,
      auxiliaryDamage: 0,
      fireDamage: 0,
      frostDamage: 0,
      lightningDamage: 0,
      thirdAttDamage: 0,
      damageDealtAfterDefensive: 0,
      damageDealtAfterDefensivePercentage: 0,
      damageTaken: 0,
      distanceDamageTaken: 0,
      meleeDamageTaken: 0,
      auxiliaryDamageTaken: 0,
      fireDamageTaken: 0,
      frostDamageTaken: 0,
      lightningDamageTaken: 0,
      thirdAttDamageTaken: 0,
      flatDamageTaken: 0,
      rageDamageDealt: 0,
      trueDamageDealt: 0,
      trueDamageTaken: 0,
      stigmaDamageDealt: 0,
      stigmaDamageTaken: 0,
      passiveHealing: 0,
      activeHealing: 0,
      armorPierces: 0,
      criticalHits: 0,
      reducedArmor: 0,
      reducedPoisonResistance: 0,
      magicResistanceDestroyed: 0,
      woundDamageTaken: 0,
      legbonAnguishDamageTaken: 0,
      poisonDamageTaken: 0,
      injureDamageTaken: 0,
      injures: 0,
      critWoundDamageTaken: 0,
      evasions: 0,
      attacksEvaded: 0,
      counters: 0,
      fastArrows: 0,
      firePassiveDamageTaken: 0,
      lightningPassiveDamageTaken: 0,
      destroyedEnergy: 0,
      destroyedMana: 0,
      blockedDamage: 0,
      blocks: 0,
      attacksBlocked: 0,
      regeneratedEnergy: 0,
      regeneratedMana: 0,
      reflectedDamage: 0,
      reflectedDamageTaken: 0,
      legbonCurse: 0,
      legbonCleanse: 0,
      legbonLastheal: 0,
      legbonLasthealValue: 0,
      legbonGlare: 0,
      legbonHolytouch: 0,
      legbonHolytouchValue: 0,
      legbonCritredValue: 0,
      legbonFacadeValue: 0,
      legbonVerycrit: 0,
      legbonAnguish: 0,
      legbonPunctureValue: 0,
      legbons: 0,
      ph: 0,
    };
  }

  private calculateBattleDuration(events: BattlePayload["events"]): number {
    if (!events.length) {
      throw new Error("No events found in battle data");
    }

    const firstTimestamp = events[0]?.ev ?? 0;
    const lastTimestamp = events[events.length - 1]?.ev ?? 0;

    return lastTimestamp - firstTimestamp;
  }

  private processOutcome(move: ParsedMove) {
    for (const { actionType, param } of move.actions) {
      if (actionType === "winner") {
        this.battleOutcome.winner = param;
      } else if (actionType === "loser") {
        this.battleOutcome.loser = param;
      }
    }
  }

  private determineBattleType() {
    const warriors = Array.from(this.warriors.values());
    const team1Count = warriors.filter((w) => w.team === 1).length;
    const team2Count = warriors.filter((w) => w.team === 2).length;

    this.battleType = `${team1Count}v${team2Count}`;
  }

  private getMatchmakingInfo(
    events: BattlePayload["events"],
  ): MatchmakingInfo | undefined {
    for (const event of events) {
      if (event.match_summary) {
        const summary = event.match_summary;
        return {
          difficultyRank: summary.difficulty_rank,
          result: summary.result,
          ratingDelta: summary.rating_delta,
          opponentLvl: summary.opponent_lvl,
          opponentOplvl: summary.opponent_oplvl,
          opponentRating: summary.opponent_rating,
          rating: summary.rating,
          status: summary.status,
          pointsGained: summary.points_gained,
          placementCur: summary.placement_cur,
          placementMax: summary.placement_max,
          dailyStageId: summary.daily_stage?.id,
          dailyPointsCur: summary.daily_stage?.points_cur,
          dailyPointsMax: summary.daily_stage?.points_max,
          dailyPointsStep: summary.daily_stage?.points_step,
          dailyRewardsLast: summary.daily_stage?.rewards_last,
          dailyRewardsCur: summary.daily_stage?.rewards_cur,
          dailyRewardsMax: summary.daily_stage?.rewards_max,
        };
      }
    }

    return undefined;
  }

  private determineOutcomeTeams(): void {
    const winnerNames = splitOutcomeNames(this.battleOutcome.winner);
    const loserNames = splitOutcomeNames(this.battleOutcome.loser);

    let winningTeam = this.getTeamFromOutcomeNames(winnerNames);
    let losingTeam = this.getTeamFromOutcomeNames(loserNames);

    if (winningTeam === null && losingTeam !== null) {
      winningTeam = this.getOpposingTeam(losingTeam);
    } else if (losingTeam === null && winningTeam !== null) {
      losingTeam = this.getOpposingTeam(winningTeam);
    }

    if (winningTeam === null || losingTeam === null) {
      ({ winningTeam, losingTeam } = this.resolveFallbackOutcomeTeams(
        winningTeam,
        losingTeam,
      ));
    }

    this.battleOutcome.winningTeam = winningTeam;
    this.battleOutcome.losingTeam = losingTeam;
  }

  private getTeamFromOutcomeNames(names: string[]): number | null {
    if (names.length === 0) return null;

    const tokens = names.map((name) => name.trim());
    const normalizedNames = new Set(tokens.map((name) => this.normalize(name)));
    const numericIds = new Set(tokens.filter((token) => /^\d+$/.test(token)));
    const matchedTeams: number[] = [];

    for (const [id, warrior] of this.warriors.entries()) {
      if (numericIds.has(id) || numericIds.has(String(warrior.originalId))) {
        matchedTeams.push(warrior.team);
        continue;
      }
      if (normalizedNames.has(this.normalize(warrior.name))) {
        matchedTeams.push(warrior.team);
      }
    }

    if (matchedTeams.length === 0) return null;

    const counts = matchedTeams.reduce<Record<number, number>>((acc, team) => {
      addTeamMetric(acc, team, 1);
      return acc;
    }, {});
    const [topEntry] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return topEntry ? Number(topEntry[0]) : null;
  }

  private collectTeamOutcomeMetrics(): TeamOutcomeMetrics {
    const metrics: TeamOutcomeMetrics = {
      hpSum: {},
      alive: {},
      dmgDealt: {},
      dmgTaken: {},
    };

    for (const [id, warrior] of this.warriors.entries()) {
      const hp = this.lastHp.get(id);
      const hpValue = typeof hp === "number" ? hp : 0;
      addTeamMetric(metrics.hpSum, warrior.team, hpValue);
      addTeamMetric(metrics.alive, warrior.team, hpValue > 0 ? 1 : 0);
      addTeamMetric(metrics.dmgDealt, warrior.team, warrior.damageDealt);
      addTeamMetric(metrics.dmgTaken, warrior.team, warrior.damageTaken);
    }

    return metrics;
  }

  private resolveFallbackOutcomeTeams(
    winningTeam: number | null,
    losingTeam: number | null,
  ): OutcomeTeams {
    if (winningTeam === null && losingTeam === null) {
      return this.resolveOutcomeFromMetrics(this.collectTeamOutcomeMetrics());
    }
    if (winningTeam === null) {
      return {
        winningTeam: this.getDefaultOpposingTeam(losingTeam as number),
        losingTeam,
      };
    }
    return {
      winningTeam,
      losingTeam: this.getDefaultOpposingTeam(winningTeam),
    };
  }

  private resolveOutcomeFromMetrics(teams: TeamOutcomeMetrics): OutcomeTeams {
    const [teamOne, teamTwo] = [1, 2];
    const aliveOne = teams.alive[teamOne] ?? 0;
    const aliveTwo = teams.alive[teamTwo] ?? 0;
    const hpOne = teams.hpSum[teamOne] ?? 0;
    const hpTwo = teams.hpSum[teamTwo] ?? 0;
    const dealtOne = teams.dmgDealt[teamOne] ?? 0;
    const dealtTwo = teams.dmgDealt[teamTwo] ?? 0;
    const takenOne = teams.dmgTaken[teamOne] ?? 0;
    const takenTwo = teams.dmgTaken[teamTwo] ?? 0;

    if (aliveOne !== aliveTwo) {
      return this.outcomeFromComparison(aliveOne > aliveTwo);
    }
    if (hpOne !== hpTwo) {
      return this.outcomeFromComparison(hpOne > hpTwo);
    }
    if (dealtOne !== dealtTwo) {
      return this.outcomeFromComparison(dealtOne > dealtTwo);
    }
    if (takenOne !== takenTwo) {
      return this.outcomeFromComparison(takenOne < takenTwo);
    }
    return { winningTeam: teamOne, losingTeam: teamTwo };
  }

  private outcomeFromComparison(teamOneWins: boolean): OutcomeTeams {
    const winningTeam = teamOneWins ? 1 : 2;
    return {
      winningTeam,
      losingTeam: this.getDefaultOpposingTeam(winningTeam),
    };
  }

  private getDefaultOpposingTeam(team: number): number {
    return team === 1 ? 2 : 1;
  }

  private getOpposingTeam(team: number): number | null {
    if (team === 1) {
      return 2;
    }

    if (team === 2) {
      return 1;
    }

    return null;
  }

  private calculateDerivedStats(): void {
    for (const warrior of this.warriors.values()) {
      warrior.damageDealtAfterDefensivePercentage =
        warrior.damageDealt > 0
          ? Math.round(
              (warrior.damageDealtAfterDefensive / warrior.damageDealt) * 10000,
            ) / 100
          : 0;
      warrior.legbons = this.getLegendaryTotal(warrior);

      if (warrior.ph !== 0) {
        const isWinning = warrior.team === this.battleOutcome.winningTeam;
        const isLosing = warrior.team === this.battleOutcome.losingTeam;
        if ((isLosing && warrior.ph > 0) || (isWinning && warrior.ph < 0)) {
          warrior.ph = -warrior.ph;
        }
      }
    }
  }

  private normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private findWarrior(name: string): Warrior | null;
  private findWarrior(name: string, withId: true): [string, Warrior] | null;
  private findWarrior(
    name: string,
    withId = false,
  ): Warrior | [string, Warrior] | null {
    const normalizedName = this.normalize(name);

    for (const [id, warrior] of this.warriors.entries()) {
      if (this.normalize(warrior.name) === normalizedName) {
        return withId ? [id, warrior] : warrior;
      }
    }

    return null;
  }

  private tryCalculateMaxHp(
    warriorId: string,
    damageReceived: number,
    hpAfter: number | null,
  ): void {
    const warrior = this.warriors.get(warriorId);
    if (!warrior || damageReceived <= 0 || hpAfter === null) return;

    const hpBefore = this.lastHp.get(warriorId);
    if (hpBefore === undefined || hpBefore === hpAfter) return;

    const hpDrop = hpBefore - hpAfter;
    if (hpDrop <= 0) return;

    const calculatedMaxHp = Math.round(damageReceived / (hpDrop / 100));

    if (calculatedMaxHp > 0 && calculatedMaxHp < 1000000) {
      if (warrior.maxHp === 0 || calculatedMaxHp > warrior.maxHp) {
        warrior.maxHp = calculatedMaxHp;
      }
    }
  }

  private calculateBattleStatistics(): BattleStatistics {
    const warriors = Array.from(this.warriors.values());
    const activeWarriors = warriors.filter((w) => w.turns > 0);

    const findTop = (
      warriors: Warrior[],
      getValue: (w: Warrior) => number,
      format?: (value: number) => string,
    ): StatisticEntry | null => {
      if (warriors.length === 0) return null;
      const top = warriors.reduce((best, current) => {
        const bestValue = getValue(best);
        const currentValue = getValue(current);
        return currentValue > bestValue ? current : best;
      });
      const value = getValue(top);
      return value > 0
        ? {
            warriorId: top.originalId,
            name: top.name,
            value,
            formattedValue: format ? format(value) : undefined,
          }
        : null;
    };

    return {
      topDamageDealer: findTop(warriors, (w) => w.damageDealtAfterDefensive),
      topTank: findTop(warriors, (w) => w.damageTaken),
      bestEfficiency: findTop(
        warriors.filter((w) => w.damageDealt > 0),
        (w) => w.damageDealtAfterDefensivePercentage,
        (v) => `${v.toFixed(2)}%`,
      ),
      criticalMaster: findTop(warriors, (w) => w.criticalHits),
      evasionExpert: findTop(warriors, (w) => w.evasions),
      shieldWall: findTop(warriors, (w) => w.blocks),
      damagePerTurn: findTop(
        activeWarriors,
        (w) => (w.turns > 0 ? w.damageDealtAfterDefensive / w.turns : 0),
        (v) => v.toFixed(1),
      ),
      mostActive: findTop(warriors, (w) => w.turns),
      legendaryWarrior: findTop(warriors, this.getLegendaryTotal),
      untouchable: findTop(warriors, (w) => w.evasions + w.blocks),
    };
  }

  private getLegendaryTotal(w: Warrior) {
    return (
      w.legbonCurse +
      w.legbonCleanse +
      w.legbonLastheal +
      w.legbonGlare +
      w.legbonHolytouch +
      w.legbonVerycrit +
      w.legbonAnguish
    );
  }
}
