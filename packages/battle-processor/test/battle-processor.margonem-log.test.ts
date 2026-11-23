import { describe, expect, it } from "bun:test";
import {
  processBattleWithStatisticsParity,
  duel,
  findWarrior,
} from "./battle-processor.fixtures.js";

describe("BattleProcessor", () => {
  describe("Margonem log semantics", () => {
    it("credits a wide swing's extra hit to the attacker instead of reflecting it", () => {
      const result = processBattleWithStatisticsParity(
        duel([
          "1=100;2=90;+swing;+dmg=500;-dmg=400;+oth_dmg=300,dmg,Bystander(80%)",
        ]),
      );

      expect(findWarrior(result, "Attacker")).toMatchObject({
        damageDealtAfterDefensive: 700,
        damageTaken: 0,
        reflectedDamageTaken: 0,
      });
      expect(findWarrior(result, "Bystander")?.damageTaken).toBe(300);
      expect(result.battleTimeline[0]?.deltas.byWarrior["4"]?.damageTaken).toBe(
        300,
      );
    });

    it("counts damage the log names on the actor as reflected by the target", () => {
      const result = processBattleWithStatisticsParity(
        duel(["1=90;2=100;+dmg=500;-dmg=0;+oth_dmg=150,dmg,Attacker(90%)"]),
      );

      expect(findWarrior(result, "Attacker")).toMatchObject({
        damageTaken: 150,
        reflectedDamageTaken: 150,
      });
      expect(findWarrior(result, "Defender")?.reflectedDamage).toBe(150);
      expect(result.battleTimeline[0]?.deltas.byWarrior["2"]?.damageDealt).toBe(
        150,
      );
    });

    it("adds unavoidable and frost over-time damage to the actor's damage taken", () => {
      const result = processBattleWithStatisticsParity(
        duel([
          "1=95;0;frost=120,10",
          "1=90;0;absolute=80",
          "1=85;0;physical=40",
        ]),
      );

      expect(findWarrior(result, "Attacker")?.damageTaken).toBe(240);
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("counts off-hand and unlisted damage suffixes as attack damage", () => {
      const result = processBattleWithStatisticsParity(
        duel(["1=100;2=90;+of_dmg=200;+dmgx=50;-dmgx=50"]),
      );

      expect(findWarrior(result, "Attacker")).toMatchObject({
        damageDealt: 250,
        auxiliaryDamage: 200,
        damageDealtAfterDefensive: 50,
      });
      expect(findWarrior(result, "Defender")?.damageTaken).toBe(50);
      expect(result.actionCoverage.unknown).toHaveLength(0);
    });

    it("keeps the sign of energy, mana and healing changes", () => {
      const result = processBattleWithStatisticsParity(
        duel([
          "1=100;2=100;en-regen=30",
          "1=100;0;energy=-20",
          "1=100;0;energy=15",
          "1=100;0;mana=-40",
          "1=100;0;heal=-50",
          "1=100;0;heal=70",
        ]),
      );

      expect(findWarrior(result, "Attacker")).toMatchObject({
        regeneratedEnergy: 35,
        regeneratedMana: 40,
        passiveHealing: 70,
      });
      expect(findWarrior(result, "Defender")?.regeneratedEnergy).toBe(0);
      expect(
        result.battleTimeline[3]?.deltas.byWarrior["1"]?.resourceDelta,
      ).toBe(40);
      expect(result.battleTimeline[4]?.deltas.healing).toBe(0);
    });

    it("renews absorption on the defender and never on an absorption breaker", () => {
      const result = processBattleWithStatisticsParity(
        duel([
          "1=100;2=100;+dmg=500;+abdest=60;+absorb=40;-absorb=100;-dmg=200",
        ]),
      );

      const deltas = result.battleTimeline[0]?.deltas.byWarrior;

      expect(deltas?.["1"]?.absorbGained).toBe(0);
      expect(deltas?.["2"]?.absorbGained).toBe(40);
      expect(deltas?.["2"]?.absorbSpent).toBe(100);
    });

    it("marks a kill only on the row the warrior falls in", () => {
      const result = processBattleWithStatisticsParity(
        duel(["1=100;2=0;+dmg=900;-dmg=900", "3=100;4=90;+dmg=100;-dmg=100"]),
      );

      const [killRow, laterRow] = result.battleTimeline;

      expect(killRow?.labels).toContain("kill:2");
      expect(killRow?.reason).toBe("kill");
      expect(laterRow?.flags).not.toContain("kill");
    });

    it("credits last heal to the warrior the log names", () => {
      const result = processBattleWithStatisticsParity(
        duel(["1=100;2=100;+dmg=100;legbon_lastheal=300,Ally;-dmg=100"]),
      );

      expect(findWarrior(result, "Ally")).toMatchObject({
        legbonLastheal: 1,
        legbonLasthealValue: 300,
      });
      expect(
        result.battleTimeline[0]?.deltas.byWarrior["3"]?.healingReceived,
      ).toBe(300);
    });
  });
});
