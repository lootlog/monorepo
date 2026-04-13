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
  matchmaking?: MatchmakingInfo;
};

export class BattleProcessor {
  private readonly warriors = new Map<string, Warrior>();
  private readonly lastHp = new Map<string, number>();
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
      matchmaking: matchmakingInfo,
    };
  }

  public extractAndParseMoves(events: BattlePayload["events"]): ParsedMove[] {
    const allMoves = events.flatMap((event) => event.f?.m || []);

    return allMoves.map((move) => {
      const [attackerPart, defenderPart, ...actions] = move.split(";");
      const [attackerId, attackerHp] = attackerPart.split("=");
      const [defenderId, defenderHp] = defenderPart.split("=");

      return {
        attackerId: attackerId !== "0" ? attackerId : null,
        defenderId: defenderId !== "0" ? defenderId : null,
        attackerHpPercentage: attackerHp
          ? Number.parseInt(attackerHp, 10)
          : null,
        defenderHpPercentage: defenderHp
          ? Number.parseInt(defenderHp, 10)
          : null,
        actions: actions.map((action) => {
          const [actionType, param = ""] = action.split("=");
          return { actionType, param };
        }),
      };
    });
  }

  private calculateBattleStats(
    moves: ParsedMove[],
    battleMeta: { characterId: string },
  ) {
    for (const move of moves) {
      this.processOutcome(move);

      if (!move.actions.length) {
        this.updateHpTracking(move);
        continue;
      }

      const tspellAction = move.actions.find((a) => a.actionType === "tspell");
      const hasStepAction = move.actions.some((a) => a.actionType === "step");

      if (hasStepAction) {
        const attacker = this.warriors.get(move.attackerId!);
        if (attacker) {
          attacker.turns++;
          attacker.steps++;
        }
      }

      this.processTurnTracking(move, tspellAction);
      this.processActions(move, !!tspellAction, battleMeta);
      this.updateHpTracking(move);
    }
  }

  private processTurnTracking(
    move: ParsedMove,
    tspellAction?: { actionType: string; param: string },
  ) {
    if (tspellAction) {
      if (move.attackerId && move.defenderId) {
        const attacker = this.warriors.get(move.attackerId);
        if (attacker) {
          attacker.turns++;
          attacker.spellsUsed++;
          const spellName = tspellAction.param || "unknown";
          attacker.spellsUsedMap[spellName] =
            (attacker.spellsUsedMap[spellName] || 0) + 1;
        }
      }

      const skillId = tspellAction.param
        ? Number.parseInt(tspellAction.param, 10)
        : 0;
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

    for (const { actionType, param } of move.actions) {
      if (actionType === "winner" || actionType === "loser") {
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

      const value = Number.parseInt(param, 10);
      const [firstParam] = param.split(",");
      const firstValue = firstParam ? Number.parseInt(firstParam, 10) : 0;

      const damageDealtMap: Record<string, keyof Warrior> = {
        "+dmgd": "distanceDamage",
        "+dmg": "meleeDamage",
        "+dmgo": "auxiliaryDamage",
        "+dmgf": "fireDamage",
        "+dmgc": "frostDamage",
        "+dmgl": "lightningDamage",
        "+thirdatt": "thirdAttDamage",
      };

      if (damageDealtMap[actionType]) {
        attacker.damageDealt += value;
        (attacker[damageDealtMap[actionType]] as number) += value;
        continue;
      }

      const damageTakenMap: Record<string, keyof Warrior> = {
        "-dmgd": "distanceDamageTaken",
        "-dmg": "meleeDamageTaken",
        "-dmgo": "auxiliaryDamageTaken",
        "-dmgf": "fireDamageTaken",
        "-dmgc": "frostDamageTaken",
        "-dmgl": "lightningDamageTaken",
        "-thirdatt": "thirdAttDamageTaken",
      };

      if (damageTakenMap[actionType]) {
        attacker.damageDealtAfterDefensive += value;
        if (defender) {
          defender.damageTaken += value;
          (defender[damageTakenMap[actionType]] as number) += value;
          defender.flatDamageTaken += value;
          this.tryCalculateMaxHp(
            move.defenderId!,
            value,
            move.defenderHpPercentage,
          );
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
      const targetNameWithHp = parts[2].trim();
      const hpMatch = targetNameWithHp.match(/\((\d+)%\)$/);
      const targetHp = hpMatch ? Number.parseInt(hpMatch[1], 10) : null;
      const targetName = targetNameWithHp.split("(")[0].trim();

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

    const firstTimestamp = events[0]?.ev || 0;
    const lastTimestamp = events[events.length - 1]?.ev || 0;

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
      return Number(sorted[0][0]);
    };

    const winnerNames = splitNames(this.battleOutcome.winner);
    const loserNames = splitNames(this.battleOutcome.loser);

    let winningTeam = getTeamFromNames(winnerNames);
    let losingTeam = getTeamFromNames(loserNames);

    const inferTeam = (team: number | null): number | null =>
      team === 1 ? 2 : team === 2 ? 1 : null;

    if (winningTeam === null && losingTeam !== null) {
      winningTeam = inferTeam(losingTeam);
    } else if (losingTeam === null && winningTeam !== null) {
      losingTeam = inferTeam(winningTeam);
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

      if (winningTeam === null && losingTeam === null) {
        if (alive1 !== alive2) {
          winningTeam = alive1 > alive2 ? t1 : t2;
          losingTeam = winningTeam === t1 ? t2 : t1;
        } else if (hp1 !== hp2) {
          winningTeam = hp1 > hp2 ? t1 : t2;
          losingTeam = winningTeam === t1 ? t2 : t1;
        } else if (dealt1 !== dealt2) {
          winningTeam = dealt1 > dealt2 ? t1 : t2;
          losingTeam = winningTeam === t1 ? t2 : t1;
        } else if (taken1 !== taken2) {
          winningTeam = taken1 < taken2 ? t1 : t2;
          losingTeam = winningTeam === t1 ? t2 : t1;
        } else {
          // Deterministic default
          winningTeam = t1;
          losingTeam = t2;
        }
      } else if (winningTeam === null) {
        winningTeam = losingTeam === t1 ? t2 : t1;
      } else if (losingTeam === null) {
        losingTeam = winningTeam === t1 ? t2 : t1;
      }
    }

    this.battleOutcome.winningTeam = winningTeam;
    this.battleOutcome.losingTeam = losingTeam;
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
