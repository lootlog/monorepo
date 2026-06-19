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

  private analyzeTimelineActions(move: ParsedMove): {
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
  } {
    const byWarrior: Record<string, BattleTimelineWarriorDelta> = {};
    const flags = new Set<string>();
    const labels = new Set<string>();
    const actions: BattleTimelineAction[] = [];
    const hasActualDamage = move.actions.some(
      (action) => DAMAGE_TAKEN_ACTIONS[action.actionType],
    );

    let damage = 0;
    let healing = 0;
    let mitigation = 0;
    let resourcePressure = 0;
    let energyPressure = 0;
    let manaPressure = 0;

    for (const { actionType, param } of move.actions) {
      const category = this.getActionCategory(actionType);
      const handled = category !== "unknown";
      const value = this.parseActionValue(param);
      const actorId = move.attackerId;
      const targetId = move.defenderId;

      this.recordActionCoverage(actionType, category, handled);

      actions.push({
        actionType,
        param,
        category,
        actorId,
        targetId,
        value,
        handled,
      });

      if (DAMAGE_DEALT_ACTIONS[actionType]) {
        if (!hasActualDamage && actorId) {
          this.addTimelineDelta(byWarrior, actorId, "damageDealt", value);
          damage += value;
        }
        flags.add("damage");
        continue;
      }

      if (DAMAGE_TAKEN_ACTIONS[actionType]) {
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "damageDealt", value);
        }
        if (targetId) {
          this.addTimelineDelta(byWarrior, targetId, "damageTaken", value);
          if (actionType === "-dmga" || actionType === "-dmgo") {
            this.trackAuxiliaryDamageTaken(targetId, value);
          }
        }
        damage += value;
        flags.add("damage");
        continue;
      }

      const specialDamageAction = SPECIAL_DAMAGE_ACTIONS[actionType];
      if (specialDamageAction) {
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "damageDealt", value);
        }
        if (targetId && specialDamageAction.targetTakesDamage) {
          this.addTimelineDelta(byWarrior, targetId, "damageTaken", value);
        }
        damage += value;
        flags.add("damage");
        continue;
      }

      if (PASSIVE_DAMAGE_ACTIONS.has(actionType)) {
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "damageTaken", value);
          this.trackEffectDamage(actorId, value);
        }
        damage += value;
        flags.add("effectDamage");
        continue;
      }

      if (HEALING_ACTIONS.has(actionType)) {
        const healedWarriorId =
          actionType === "heal_target" || actionType === "legbon_lastheal"
            ? (targetId ?? actorId)
            : actorId;
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "healingDone", value);
          if (actionType === "heal_target") {
            this.trackTargetHealing(actorId, value);
          }
        }
        if (healedWarriorId) {
          this.addTimelineDelta(
            byWarrior,
            healedWarriorId,
            "healingReceived",
            value,
          );
        }
        healing += value;
        flags.add("healing");
        continue;
      }

      if (MITIGATION_ACTIONS.has(actionType)) {
        const defenderId = targetId ?? actorId;
        if (defenderId) {
          this.addTimelineDelta(byWarrior, defenderId, "mitigation", value);
          this.trackMitigationEvent(defenderId);
        }
        mitigation += value;
        flags.add(this.getMitigationFlag(actionType));
        continue;
      }

      if (COUNTER_ACTIONS.has(actionType)) {
        flags.add("counter");
        continue;
      }

      if (ABSORB_GAIN_ACTIONS.has(actionType)) {
        const warriorId = actorId ?? targetId;
        if (warriorId) {
          this.addTimelineDelta(byWarrior, warriorId, "absorbGained", value);
          this.trackAbsorb(warriorId, "absorptionGained", value);
        }
        flags.add("absorb");
        continue;
      }

      if (MAGIC_ABSORB_GAIN_ACTIONS.has(actionType)) {
        const warriorId = actorId ?? targetId;
        if (warriorId) {
          this.addTimelineDelta(
            byWarrior,
            warriorId,
            "magicAbsorbGained",
            value,
          );
          this.trackAbsorb(warriorId, "magicAbsorptionGained", value);
        }
        flags.add("absorb");
        continue;
      }

      if (ABSORB_SPEND_ACTIONS.has(actionType)) {
        const warriorId = targetId ?? actorId;
        if (warriorId) {
          this.addTimelineDelta(byWarrior, warriorId, "absorbSpent", value);
          this.trackAbsorb(warriorId, "absorptionSpent", value);
        }
        mitigation += value;
        flags.add("absorb");
        continue;
      }

      if (MAGIC_ABSORB_SPEND_ACTIONS.has(actionType)) {
        const warriorId = targetId ?? actorId;
        if (warriorId) {
          this.addTimelineDelta(
            byWarrior,
            warriorId,
            "magicAbsorbSpent",
            value,
          );
          this.trackAbsorb(warriorId, "magicAbsorptionSpent", value);
        }
        mitigation += value;
        flags.add("absorb");
        continue;
      }

      if (CONTROL_ACTIONS.has(actionType)) {
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "controlApplied", 1);
          this.trackControl(actorId, "controlApplied");
        }
        if (targetId) {
          this.addTimelineDelta(byWarrior, targetId, "controlTaken", 1);
          this.trackControl(targetId, "controlTaken");
        }
        flags.add(actionType.includes("freeze") ? "freeze" : "stun");
        continue;
      }

      if (RESOURCE_ACTIONS.has(actionType)) {
        const resourceTargetId =
          actionType.startsWith("-") || actionType === "stealmana"
            ? targetId
            : actorId;
        if (
          actorId &&
          (actionType.startsWith("-") || actionType === "stealmana")
        ) {
          this.addTimelineDelta(byWarrior, actorId, "resourcePressure", value);
          const pressureField = this.getResourcePressureField(actionType);
          if (pressureField) {
            this.addTimelineDelta(byWarrior, actorId, pressureField, value);
          }
          this.trackResourcePressure(actorId, actionType, value);
          resourcePressure += value;
          if (pressureField === "energyPressure") {
            energyPressure += value;
          } else if (pressureField === "manaPressure") {
            manaPressure += value;
          }
        }
        if (resourceTargetId) {
          const direction =
            actionType === "en-regen" ||
            actionType === "+energy" ||
            actionType === "+engback"
              ? value
              : -value;
          this.addTimelineDelta(
            byWarrior,
            resourceTargetId,
            "resourceDelta",
            direction,
          );
        }
        flags.add("resource");
        continue;
      }

      if (actionType === "+oth_dmg") {
        const targetFromParam = this.getTargetIdFromActionParam(param);
        const effectiveTargetId = targetFromParam ?? targetId;
        if (actorId) {
          this.addTimelineDelta(byWarrior, actorId, "damageDealt", value);
        }
        if (effectiveTargetId) {
          this.addTimelineDelta(
            byWarrior,
            effectiveTargetId,
            "damageTaken",
            value,
          );
        }
        damage += value;
        flags.add("damage");
        continue;
      }

      if (COMBO_ACTIONS.has(actionType)) {
        if (actionType === "combo-max" && actorId) {
          this.trackComboMax(actorId, value);
        }
        flags.add("combo");
        continue;
      }

      if (actionType === "+ph") {
        flags.add("ph");
        continue;
      }

      if (actionType === "flee") {
        flags.add("flee");
        continue;
      }

      if (actionType === "txt" && param.includes("utrata tury")) {
        flags.add("stun");
      }

      if (handled) {
        labels.add(actionType);
      }
    }

    return {
      actions,
      byWarrior,
      damage,
      healing,
      mitigation,
      resourcePressure,
      energyPressure,
      manaPressure,
      flags: Array.from(flags),
      labels: Array.from(labels),
    };
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
    const attacker = move.attackerId
      ? (this.warriors.get(move.attackerId) ?? null)
      : null;
    const defender = move.defenderId
      ? (this.warriors.get(move.defenderId) ?? null)
      : null;
    let defenderTakenDamage = 0;

    for (const { actionType, param } of move.actions) {
      if (actionType === "winner") {
        this.battleOutcome.winner = param;
        continue;
      }
      if (actionType === "loser") {
        this.battleOutcome.loser = param;
        continue;
      }
      if (actionType === "+ph") {
        const warrior = this.warriors.get(battleMeta.characterId);
        if (warrior) warrior.ph = +param;
      }

      // Handle turn loss (txt has no attackerId/defenderId)
      if (actionType === "txt") {
        if (param.includes("utrata tury")) {
          const warriorName = param.split(" - ")[0]?.trim();
          const warrior = warriorName ? this.findWarrior(warriorName) : null;
          if (warrior) {
            warrior.turns++;
            warrior.turnsLost++;
          }
        } else if (param.includes("poddał walkę")) {
          const warriorName = param.split(" poddał walkę")[0]?.trim();
          const warrior = warriorName ? this.findWarrior(warriorName) : null;
          if (warrior) warrior.surrendered = true;
        }
        continue;
      }

      if (!attacker) continue;

      const value = this.parseActionValue(param);
      const firstValue = value;

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

      switch (actionType) {
        case "+oth_dmg":
          if (hasSpell) {
            this.handleSpellTrueDamage(attacker, param, firstValue, defender);
          } else {
            this.handleReflectedDamage(attacker, defender, firstValue);
          }
          break;

        case "+rage":
          attacker.rageDamageDealt += value;
          break;

        case "+taken_dmg":
          attacker.stigmaDamageDealt += value;
          if (defender) defender.stigmaDamageTaken += value;
          break;

        case "+pierce":
          attacker.armorPierces++;
          break;

        case "+crit":
          attacker.criticalHits++;
          break;

        case "heal":
          attacker.passiveHealing += value;
          break;

        case "bandage":
          attacker.activeHealing += value;
          break;

        case "heal_target":
          if (defender) {
            defender.activeHealing += value;
          }
          break;

        case "+acdmg":
          attacker.reducedArmor += value;
          break;

        case "wound":
          attacker.woundDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "critwound":
          attacker.critWoundDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "anguish":
          attacker.legbonAnguishDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "poison":
          attacker.poisonDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "injure":
          attacker.injureDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "+injure":
          if (defender) defender.injures++;
          break;

        case "flee":
          attacker.fled = true;
          this.battleOutcome.hasFlee = true;
          break;

        case "+fastarrow":
          attacker.fastArrows++;
          break;

        case "fire":
          attacker.firePassiveDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "light":
          attacker.lightningPassiveDamageTaken += value;
          attacker.damageTaken += value;
          break;

        case "energy":
          attacker.regeneratedEnergy -= value;
          break;

        case "en-regen":
          attacker.regeneratedEnergy += value;
          break;

        case "+energy":
        case "+engback":
          attacker.regeneratedEnergy += value;
          break;

        case "+legbon_curse":
          attacker.legbonCurse++;
          break;

        case "+legbon_holytouch":
          attacker.legbonHolytouch++;
          break;

        case "legbon_holytouch_heal":
          attacker.legbonHolytouchValue += value;
          break;

        case "+legbon_verycrit":
          attacker.legbonVerycrit++;
          break;

        case "+legbon_anguish":
          attacker.legbonAnguish++;
          break;

        case "combo-max":
          if (move.attackerId) {
            this.trackComboMax(move.attackerId, value);
          }
          break;

        case "legbon_lastheal":
          if (defender) {
            defender.legbonLastheal++;
            defender.legbonLasthealValue += value;
          } else {
            attacker.legbonLastheal++;
            attacker.legbonLasthealValue += value;
          }
          break;
      }

      if (!defender) continue;

      switch (actionType) {
        case "-evade":
          defender.evasions++;
          if (attacker) attacker.attacksEvaded++;
          break;

        case "-contra":
          defender.counters++;
          break;

        case "-blok":
        case "-block":
        case "-parry":
        case "-arrowblock":
        case "-pierceb":
          defender.blocks++;
          defender.blockedDamage += value;
          if (attacker) attacker.attacksBlocked++;
          break;

        case "-endest":
          defender.destroyedEnergy += value;
          break;

        case "-manadest":
          defender.destroyedMana += value;
          break;

        case "en-regen":
          defender.regeneratedEnergy += value;
          break;

        case "mana":
          attacker.regeneratedMana -= value;
          break;

        case "stealmana":
          defender.destroyedMana += value;
          attacker.regeneratedMana += value;
          break;

        case "-legbon_cleanse":
          defender.legbonCleanse++;
          break;

        case "-legbon_glare":
          defender.legbonGlare++;
          break;

        case "-legbon_critred":
          defender.legbonCritredValue = value;
          break;

        case "-legbon_facade":
          defender.legbonFacadeValue = value;
          break;

        case "+legbon_puncture":
          attacker.legbonPunctureValue = value;
          break;

        case "+resdmg":
          attacker.magicResistanceDestroyed += value;
          break;

        case "+actdmg":
          attacker.reducedPoisonResistance += value;
          break;
      }
    }

    if (defender && move.defenderId && defenderTakenDamage > 0) {
      this.tryCalculateMaxHp(
        move.defenderId,
        defenderTakenDamage,
        move.defenderHpPercentage,
      );
    }
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
    if (
      DAMAGE_DEALT_ACTIONS[actionType] ||
      DAMAGE_TAKEN_ACTIONS[actionType] ||
      SPECIAL_DAMAGE_ACTIONS[actionType]
    ) {
      return "damage";
    }
    if (PASSIVE_DAMAGE_ACTIONS.has(actionType)) return "damage";
    if (HEALING_ACTIONS.has(actionType)) return "healing";
    if (MITIGATION_ACTIONS.has(actionType)) return "mitigation";
    if (COUNTER_ACTIONS.has(actionType)) return "counter";
    if (
      ABSORB_GAIN_ACTIONS.has(actionType) ||
      MAGIC_ABSORB_GAIN_ACTIONS.has(actionType) ||
      ABSORB_SPEND_ACTIONS.has(actionType) ||
      MAGIC_ABSORB_SPEND_ACTIONS.has(actionType)
    ) {
      return "absorb";
    }
    if (RESOURCE_ACTIONS.has(actionType)) return "resource";
    if (CONTROL_ACTIONS.has(actionType)) return "control";
    if (SPELL_ACTIONS.has(actionType)) return "spell";
    if (COMBO_ACTIONS.has(actionType)) return "combo";
    if (OUTCOME_ACTIONS.has(actionType)) return "outcome";
    if (MOVEMENT_ACTIONS.has(actionType)) return "movement";
    if (LEGENDARY_ACTIONS.has(actionType)) return "legendary";
    if (BUFF_ACTIONS.has(actionType)) return "buff";
    if (DEBUFF_ACTIONS.has(actionType)) return "debuff";
    if (SYSTEM_ACTIONS.has(actionType)) return "system";
    return "unknown";
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
        };
      }
    }

    return undefined;
  }

  private determineOutcomeTeams() {
    const splitNames = (s: string): string[] =>
      s
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);

    const getTeamFromNames = (names: string[]): number | null => {
      if (names.length === 0) return null;
      const tokens = names.map((n) => n.trim());
      const lowerSet = new Set(tokens.map((n) => this.normalize(n)));
      const idSet = new Set(tokens.filter((t) => /^\d+$/.test(t)));
      const teams: number[] = [];

      for (const [id, w] of this.warriors.entries()) {
        if (idSet.has(id) || idSet.has(String(w.originalId))) {
          teams.push(w.team);
          continue;
        }
        if (lowerSet.has(this.normalize(w.name))) {
          teams.push(w.team);
        }
      }

      if (teams.length === 0) return null;

      const counts = teams.reduce<Record<number, number>>((acc, t) => {
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      }, {});
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [topTeam] = sorted[0] ?? [];
      return topTeam === undefined ? null : Number(topTeam);
    };

    const winnerNames = splitNames(this.battleOutcome.winner);
    const loserNames = splitNames(this.battleOutcome.loser);

    let winningTeam = getTeamFromNames(winnerNames);
    let losingTeam = getTeamFromNames(loserNames);

    if (winningTeam === null && losingTeam !== null) {
      winningTeam = this.getOpposingTeam(losingTeam);
    } else if (losingTeam === null && winningTeam !== null) {
      losingTeam = this.getOpposingTeam(winningTeam);
    }

    if (winningTeam === null || losingTeam === null) {
      const teams = Array.from(this.warriors.entries()).reduce(
        (acc, [id, w]) => {
          const hp = this.lastHp.get(id);
          const hpValue = typeof hp === "number" ? hp : 0;
          acc.hpSum[w.team] = (acc.hpSum[w.team] ?? 0) + hpValue;
          acc.alive[w.team] = (acc.alive[w.team] ?? 0) + (hpValue > 0 ? 1 : 0);
          acc.dmgDealt[w.team] = (acc.dmgDealt[w.team] ?? 0) + w.damageDealt;
          acc.dmgTaken[w.team] = (acc.dmgTaken[w.team] ?? 0) + w.damageTaken;
          return acc;
        },
        {
          hpSum: {} as Record<number, number>,
          alive: {} as Record<number, number>,
          dmgDealt: {} as Record<number, number>,
          dmgTaken: {} as Record<number, number>,
        },
      );

      const [t1, t2] = [1, 2];
      const alive1 = teams.alive[t1] ?? 0;
      const alive2 = teams.alive[t2] ?? 0;
      const hp1 = teams.hpSum[t1] ?? 0;
      const hp2 = teams.hpSum[t2] ?? 0;
      const dealt1 = teams.dmgDealt[t1] ?? 0;
      const dealt2 = teams.dmgDealt[t2] ?? 0;
      const taken1 = teams.dmgTaken[t1] ?? 0;
      const taken2 = teams.dmgTaken[t2] ?? 0;
      const getDefaultOpposingTeam = (team: number): number =>
        team === t1 ? t2 : t1;

      if (winningTeam === null && losingTeam === null) {
        if (alive1 !== alive2) {
          winningTeam = alive1 > alive2 ? t1 : t2;
          losingTeam = getDefaultOpposingTeam(winningTeam);
        } else if (hp1 !== hp2) {
          winningTeam = hp1 > hp2 ? t1 : t2;
          losingTeam = getDefaultOpposingTeam(winningTeam);
        } else if (dealt1 !== dealt2) {
          winningTeam = dealt1 > dealt2 ? t1 : t2;
          losingTeam = getDefaultOpposingTeam(winningTeam);
        } else if (taken1 !== taken2) {
          winningTeam = taken1 < taken2 ? t1 : t2;
          losingTeam = getDefaultOpposingTeam(winningTeam);
        } else {
          // Deterministic default
          winningTeam = t1;
          losingTeam = t2;
        }
      } else if (winningTeam === null) {
        winningTeam = getDefaultOpposingTeam(losingTeam);
      } else if (losingTeam === null) {
        losingTeam = getDefaultOpposingTeam(winningTeam);
      }
    }

    this.battleOutcome.winningTeam = winningTeam;
    this.battleOutcome.losingTeam = losingTeam;
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
