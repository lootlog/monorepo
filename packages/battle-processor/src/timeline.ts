/**
 * The per-row battle timeline: HP, per-warrior deltas, and why each row
 * matters. Only the full analysis records it.
 */
import {
  ACTOR_DAMAGE_TAKEN,
  getActionCategory,
  readDamageKey,
  type BattleActionCategory,
} from "./action-keys.js";
import {
  parseActionValue,
  parseNamedWarrior,
  parseSignedActionValue,
  type ParsedMove,
} from "./battle-log.js";
import type { WarriorRoster } from "./warrior.js";

type BattleTimelineAction = {
  actionType: string;
  param: string;
  category: BattleActionCategory;
  actorId: string | null;
  targetId: string | null;
  value: number;
  handled: boolean;
};

type BattleTimelineWarriorDelta = {
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

export type BattleTimelineWarriorCumulative = BattleTimelineWarriorDelta;

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

type BattleActionCoverageEntry = {
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

export const createEmptyActionCoverage = (): BattleActionCoverage => ({
  totalActions: 0,
  handledActions: 0,
  unhandledActions: 0,
  handledPercentage: 100,
  actions: [],
  unknown: [],
});

const createEmptyDelta = (): BattleTimelineWarriorDelta => ({
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

/** Healing keys whose value is a percentage or absent, not healed life. */
const HEALING_WITHOUT_AMOUNT = new Set([
  "healall_per",
  "heal_per",
  "heal_per-allies",
  "hp_per-allies",
  "antidote",
]);

/** Healing keys that heal the row's target instead of its actor. */
const TARGET_HEALING = new Set(["heal_target", "legbon_lastheal"]);

const MITIGATION_FLAGS = new Map([
  ["-evade", "evade"],
  ["-parry", "parry"],
  ["-arrowblock", "arrowBlock"],
  ["-pierceb", "pierceBlock"],
  ["-blok", "block"],
  ["+oth_cover", "cover"],
  ["cover", "cover"],
]);

/** Keys that take energy or mana from the row's target. */
const RESOURCE_PRESSURE = new Map<string, "energyPressure" | "manaPressure">([
  ["-endest", "energyPressure"],
  ["+endest", "energyPressure"],
  ["+energy", "energyPressure"],
  ["-manadest", "manaPressure"],
  ["+manadest", "manaPressure"],
  ["stealmana", "manaPressure"],
]);

/** How each key changes its actor's own energy or mana. */
const ACTOR_RESOURCE_CHANGE = new Map<string, (signedValue: number) => number>([
  ["en-regen", (value) => value],
  ["+engback", (value) => value],
  ["managain", (value) => value],
  ["energy", (value) => -value],
  ["mana", (value) => -value],
  ["energyout", (value) => -Math.abs(value)],
]);

type RowAnalysis = {
  actions: BattleTimelineAction[];
  byWarrior: Record<string, BattleTimelineWarriorDelta>;
  damage: number;
  healing: number;
  mitigation: number;
  resourcePressure: number;
  energyPressure: number;
  manaPressure: number;
  flags: Set<string>;
  labels: Set<string>;
};

type ActionContext = {
  actionType: string;
  param: string;
  category: BattleActionCategory;
  value: number;
  actorId: string | null;
  targetId: string | null;
  /** Whether the row reports damage after the target's defence. */
  hasTakenDamage: boolean;
};

const addDelta = (
  row: RowAnalysis,
  warriorId: string | null,
  field: keyof BattleTimelineWarriorDelta,
  value: number,
): void => {
  if (!warriorId) return;

  const delta = (row.byWarrior[warriorId] ??= createEmptyDelta());
  delta[field] += value;
};

const calculateSignificanceScore = (
  row: RowAnalysis,
  teamHpDelta: Record<string, number>,
): number => {
  let score = 0;

  score += Math.min(40, Math.round(row.damage / 100));
  score += Math.min(20, Math.round(row.healing / 150));
  score += Math.min(20, Math.round(row.mitigation / 150));
  score += Math.min(10, Math.round(row.resourcePressure / 100));

  if (row.flags.has("kill")) score += 50;

  if (row.flags.has("flee")) score += 40;

  if (row.flags.has("stun") || row.flags.has("freeze")) score += 20;

  if (row.flags.has("absorb")) score += 12;

  if (row.flags.has("ph")) score += 10;

  const biggestTeamSwing = Math.max(
    0,
    ...Object.values(teamHpDelta).map((value) => Math.abs(value)),
  );

  score += Math.min(20, Math.round(biggestTeamSwing));

  return Math.min(100, score);
};

const getTimelineReason = (row: RowAnalysis): string => {
  if (row.flags.has("kill")) return "kill";

  if (row.flags.has("flee")) return "flee";

  if (row.flags.has("freeze")) return "freeze";

  if (row.flags.has("stun")) return "control";

  if (row.healing >= 500) return "bigHealing";

  if (row.mitigation >= 500 || row.flags.has("absorb")) return "mitigation";

  if (row.damage >= 1000) return "bigDamage";

  if (row.resourcePressure > 0) return "resourcePressure";

  if (row.flags.has("combo")) return "combo";

  if (row.flags.has("ph")) return "ph";

  return "tempo";
};

const roundToHundredths = (value: number): number =>
  Math.round(value * 100) / 100;

export class TimelineRecorder {
  readonly turns: BattleTimelineTurn[] = [];
  private readonly hp = new Map<string, number>();
  private readonly cumulative = new Map<
    string,
    BattleTimelineWarriorCumulative
  >();
  private readonly coverage = new Map<
    string,
    { count: number; handled: boolean; category: BattleActionCategory }
  >();

  constructor(private readonly roster: WarriorRoster) {
    for (const id of roster.byId.keys()) {
      this.hp.set(id, 100);
      this.cumulative.set(id, createEmptyDelta());
    }
  }

  recordMove(moveIndex: number, move: ParsedMove): void {
    const teamHpBefore = this.calculateTeamHp();
    const row = this.analyzeRow(move);

    for (const [id, hp] of [
      [move.attackerId, move.attackerHpPercentage],
      [move.defenderId, move.defenderHpPercentage],
    ] as const) {
      if (!id || hp === null) continue;

      // A kill belongs to the row a warrior falls in, not to every later
      // row it stays dead in. A revived warrior can fall again.
      if (hp <= 0 && (this.hp.get(id) ?? 100) > 0) {
        row.flags.add("kill");
        row.labels.add(`kill:${id}`);
      }

      this.hp.set(id, hp);
    }

    const hpByWarrior = Object.fromEntries(
      Array.from(this.roster.byId.keys(), (id) => [id, this.hp.get(id) ?? 100]),
    );

    const teamHp = this.calculateTeamHp();

    const teamHpDelta = Object.fromEntries(
      Object.entries(teamHp).map(([team, hp]) => [
        team,
        roundToHundredths(hp - (teamHpBefore[team] ?? hp)),
      ]),
    );

    for (const [warriorId, delta] of Object.entries(row.byWarrior)) {
      const total = this.cumulative.get(warriorId) ?? createEmptyDelta();

      // SAFETY: deltas are only built by createEmptyDelta, so their keys are
      // exactly the numeric delta fields.
      for (const field of Object.keys(delta) as Array<
        keyof BattleTimelineWarriorDelta
      >) {
        total[field] += delta[field];
      }

      this.cumulative.set(warriorId, total);
    }

    this.turns.push({
      turn: moveIndex + 1,
      attackerId: move.attackerId,
      defenderId: move.defenderId,
      attackerHpPercentage: move.attackerHpPercentage,
      defenderHpPercentage: move.defenderHpPercentage,
      hpByWarrior,
      teamHp,
      teamHpDelta,
      deltas: {
        damage: row.damage,
        healing: row.healing,
        mitigation: row.mitigation,
        resourcePressure: row.resourcePressure,
        energyPressure: row.energyPressure,
        manaPressure: row.manaPressure,
        byWarrior: row.byWarrior,
      },
      cumulative: Object.fromEntries(
        Array.from(this.cumulative, ([id, stats]) => [id, { ...stats }]),
      ),
      actions: row.actions,
      flags: Array.from(row.flags),
      labels: Array.from(row.labels),
      significanceScore: calculateSignificanceScore(row, teamHpDelta),
      reason: getTimelineReason(row),
    });
  }

  getActionCoverage(): BattleActionCoverage {
    const actions = Array.from(
      this.coverage,
      ([actionType, entry]): BattleActionCoverageEntry => ({
        actionType,
        ...entry,
      }),
    ).sort((a, b) => b.count - a.count);

    const totalActions = actions.reduce((sum, action) => sum + action.count, 0);

    const handledActions = actions.reduce(
      (sum, action) => sum + (action.handled ? action.count : 0),
      0,
    );

    return {
      totalActions,
      handledActions,
      unhandledActions: totalActions - handledActions,
      handledPercentage:
        totalActions > 0
          ? Math.round((handledActions / totalActions) * 10000) / 100
          : 100,
      actions,
      unknown: actions.filter((action) => !action.handled),
    };
  }

  private analyzeRow(move: ParsedMove): RowAnalysis {
    const row: RowAnalysis = {
      actions: [],
      byWarrior: {},
      damage: 0,
      healing: 0,
      mitigation: 0,
      resourcePressure: 0,
      energyPressure: 0,
      manaPressure: 0,
      flags: new Set(),
      labels: new Set(),
    };

    const hasTakenDamage = move.actions.some(
      (action) => readDamageKey(action.actionType)?.side === "taken",
    );

    for (const { actionType, param } of move.actions) {
      const category = getActionCategory(actionType);
      const handled = category !== "unknown";
      const value = parseActionValue(param);

      const coverage = this.coverage.get(actionType) ?? {
        count: 0,
        handled,
        category,
      };

      coverage.count++;
      this.coverage.set(actionType, coverage);

      row.actions.push({
        actionType,
        param,
        category,
        actorId: move.attackerId,
        targetId: move.defenderId,
        value,
        handled,
      });

      this.analyzeAction(row, {
        actionType,
        param,
        category,
        value,
        actorId: move.attackerId,
        targetId: move.defenderId,
        hasTakenDamage,
      });
    }

    return row;
  }

  private analyzeAction(row: RowAnalysis, context: ActionContext): void {
    switch (context.category) {
      case "damage":
        this.analyzeDamage(row, context);

        return;
      case "healing":
        this.analyzeHealing(row, context);

        return;
      case "mitigation":
        addDelta(
          row,
          context.targetId ?? context.actorId,
          "mitigation",
          context.value,
        );
        row.mitigation += context.value;
        row.flags.add(MITIGATION_FLAGS.get(context.actionType) ?? "mitigation");

        return;
      case "counter":
        row.flags.add("counter");

        return;
      case "absorb":
        this.analyzeAbsorb(row, context);

        return;
      case "control":
        addDelta(row, context.actorId, "controlApplied", 1);
        addDelta(row, context.targetId, "controlTaken", 1);
        row.flags.add(
          context.actionType.includes("freeze") ? "freeze" : "stun",
        );

        return;
      case "resource":
        this.analyzeResource(row, context);

        return;
      case "combo":
        row.flags.add("combo");

        return;
      case "outcome":
        if (context.actionType === "+ph") {
          row.flags.add("ph");

          return;
        }

        if (context.actionType === "flee") {
          row.flags.add("flee");

          return;
        }

        break;
      case "system":
        if (
          context.actionType === "txt" &&
          context.param.includes("utrata tury")
        ) {
          row.flags.add("stun");
        }

        break;
      default:
        break;
    }

    if (context.category !== "unknown") row.labels.add(context.actionType);
  }

  private analyzeDamage(row: RowAnalysis, context: ActionContext): void {
    const { actionType, value, actorId, targetId } = context;
    const damageKey = readDamageKey(actionType);

    // The attack a row rolled counts only when the row does not report the
    // damage left after defence.
    if (damageKey?.side === "dealt") {
      if (!context.hasTakenDamage) {
        addDelta(row, actorId, "damageDealt", value);
        row.damage += value;
      }

      row.flags.add("damage");

      return;
    }

    if (damageKey?.side === "taken") {
      addDelta(row, actorId, "damageDealt", value);
      addDelta(row, targetId, "damageTaken", value);
      row.damage += value;
      row.flags.add("damage");

      return;
    }

    if (ACTOR_DAMAGE_TAKEN.has(actionType)) {
      addDelta(row, actorId, "damageTaken", value);
      row.damage += value;
      row.flags.add("effectDamage");

      return;
    }

    if (actionType === "+oth_dmg") {
      this.analyzeOtherDamage(row, context);
    }
  }

  /** Reflected damage comes from the target; other hits from the actor. */
  private analyzeOtherDamage(row: RowAnalysis, context: ActionContext): void {
    const named = parseNamedWarrior(context.param, 2);
    const namedId = named ? this.roster.findIdByName(named.name) : null;
    const actor = this.roster.get(context.actorId);
    const victim = this.roster.get(namedId);
    const isReflected = !!actor && !!victim && victim.team === actor.team;

    addDelta(
      row,
      isReflected ? context.targetId : context.actorId,
      "damageDealt",
      context.value,
    );
    addDelta(row, namedId ?? context.targetId, "damageTaken", context.value);
    row.damage += context.value;
    row.flags.add("damage");
  }

  private analyzeHealing(row: RowAnalysis, context: ActionContext): void {
    const { actionType, param, actorId, targetId } = context;
    row.flags.add("healing");

    if (HEALING_WITHOUT_AMOUNT.has(actionType)) return;

    // `heal` reports lost life as a negative value.
    const amount =
      actionType === "heal" ? parseSignedActionValue(param) : context.value;

    if (amount <= 0) return;

    const named =
      actionType === "legbon_lastheal" ? parseNamedWarrior(param, 1) : null;

    const healedId =
      (named ? this.roster.findIdByName(named.name) : null) ??
      (TARGET_HEALING.has(actionType) ? (targetId ?? actorId) : actorId);

    addDelta(row, actorId, "healingDone", amount);
    addDelta(row, healedId, "healingReceived", amount);
    row.healing += amount;
  }

  /** Margonem renders absorption renewal on the defending side of a row. */
  private analyzeAbsorb(row: RowAnalysis, context: ActionContext): void {
    const defenderId = context.targetId ?? context.actorId;

    const field = (
      {
        "+absorb": "absorbGained",
        "+absorbm": "magicAbsorbGained",
        "-absorb": "absorbSpent",
        "-absorbm": "magicAbsorbSpent",
      } as const
    )[context.actionType];

    if (field) addDelta(row, defenderId, field, context.value);

    if (context.actionType.startsWith("-")) row.mitigation += context.value;

    row.flags.add("absorb");
  }

  private analyzeResource(row: RowAnalysis, context: ActionContext): void {
    const { actionType, param, value, actorId, targetId } = context;
    const pressureField = RESOURCE_PRESSURE.get(actionType);
    row.flags.add("resource");

    if (pressureField) {
      addDelta(row, actorId, "resourcePressure", value);
      addDelta(row, actorId, pressureField, value);
      addDelta(row, targetId, "resourceDelta", -value);
      row.resourcePressure += value;
      row[pressureField] += value;

      return;
    }

    if (actionType === "manatransfer") {
      addDelta(row, actorId, "resourceDelta", -value);
      addDelta(row, targetId, "resourceDelta", value);

      return;
    }

    const actorChange = ACTOR_RESOURCE_CHANGE.get(actionType);

    if (actorChange) {
      addDelta(
        row,
        actorId,
        "resourceDelta",
        actorChange(parseSignedActionValue(param)),
      );
    }
  }

  private calculateTeamHp(): Record<string, number> {
    const teamHp = new Map<number, { total: number; count: number }>();

    for (const [warriorId, warrior] of this.roster.byId) {
      const entry = teamHp.get(warrior.team) ?? { total: 0, count: 0 };
      entry.total += this.hp.get(warriorId) ?? 100;
      entry.count++;
      teamHp.set(warrior.team, entry);
    }

    return Object.fromEntries(
      Array.from(teamHp, ([team, entry]) => [
        String(team),
        entry.count > 0 ? roundToHundredths(entry.total / entry.count) : 0,
      ]),
    );
  }
}
