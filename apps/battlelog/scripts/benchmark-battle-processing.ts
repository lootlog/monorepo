import {
  BattleProcessor,
  type BattlePayload,
  type BattleAnalysis,
} from "@lootlog/battle-processor";

const createBattle = (
  warriorCount: number,
  moveCount: number,
): BattlePayload => ({
  accountId: "synthetic-account",
  characterId: "1",
  world: "synthetic",
  events: [
    {
      ev: 1_000,
      f: {
        w: Object.fromEntries(
          Array.from({ length: warriorCount }, (_, index) => [
            String(index + 1),
            {
              originalId: index + 1,
              name: `Warrior${index + 1}`,
              lvl: 300,
              prof: index % 2 ? "w" : "m",
              team: (index % 2) + 1,
              icon: "synthetic.gif",
            },
          ]),
        ),
        m: Array.from({ length: moveCount }, (_, index) => {
          const actor = (index % warriorCount) + 1;
          const target = ((index + 1) % warriorCount) + 1;

          const actions =
            index % 4 === 0
              ? "tspell=Fire;skillId=97;mana=-20"
              : "step;combo-max=2";

          return `${actor}=100;${target}=95;+dmg=500;-dmg=400;-absorb=100;${actions}`;
        }),
      },
    },
    { ev: 1_060, f: { m: ["0;0;winner=Warrior1;loser=Warrior2"] } },
  ],
});

const measure = (run: () => BattleAnalysis) => {
  for (let index = 0; index < 10; index++) run();

  const samples: number[] = [];

  for (let index = 0; index < 40; index++) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }

  samples.sort((left, right) => left - right);

  return { medianMs: samples[20], p95Ms: samples[38] };
};

for (const [warriors, moves] of [
  [2, 100],
  [20, 2_000],
]) {
  const data = createBattle(warriors, moves);
  const full = new BattleProcessor().processBattle(data);
  const statistics = new BattleProcessor("statistics").processBattle(data);

  const {
    battleTimeline: _fullTimeline,
    warriorMechanics: _fullMechanics,
    actionCoverage: _fullCoverage,
    ...fullStats
  } = full;

  const {
    battleTimeline: _statisticsTimeline,
    warriorMechanics: _statisticsMechanics,
    actionCoverage: _statisticsCoverage,
    ...statisticsStats
  } = statistics;

  if (!Bun.deepEquals(fullStats, statisticsStats)) {
    throw new Error("Statistics differ when skipping detailed battle analysis");
  }

  await Bun.write(
    Bun.stdout,
    JSON.stringify({
      warriors,
      moves,
      samples: 40,
      inputBytes: Buffer.byteLength(JSON.stringify(data)),
      full: measure(() => new BattleProcessor().processBattle(data)),
      statistics: measure(() =>
        new BattleProcessor("statistics").processBattle(data),
      ),
      fullOutputBytes: Buffer.byteLength(JSON.stringify(full)),
      statisticsOutputBytes: Buffer.byteLength(JSON.stringify(statistics)),
      timelineTurns: full.battleTimeline.length,
      statisticsEqual: true,
    }) + "\n",
  );
}
