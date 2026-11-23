import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Schema } from "effect";

const HELP = `Usage:
  bun run render-metrics run [--out <file>] [--runs <n>]
  bun run render-metrics compare <before.json> <after.json> [--top <n>]

run      Runs the game client render scenarios (src/**/*.renders.tsx through
         vitest.renders.config.ts) and prints or writes
         { scenario: { commits, renders, components } }. Fails unless all
         --runs (default 3) produced identical counts.
compare  Prints a markdown table of commit and render deltas per scenario and
         the components whose render counts changed most (default top 10).

To compare two revisions, run each checkout and compare the files:
  git worktree add ../lootlog-main main
  (cd ../lootlog-main && bun install && bun run render-metrics run --out /tmp/before.json)
  bun run render-metrics run --out /tmp/after.json
  bun run render-metrics compare /tmp/before.json /tmp/after.json
Copy the harness files into a checkout that predates them.`;

export const RENDER_METRICS_DIRECTORY_ENV = "LOOTLOG_RENDER_METRICS_DIR";

const RenderReportSchema = Schema.Struct({
  commits: Schema.Number,
  renders: Schema.Number,
  components: Schema.Record(Schema.String, Schema.Number),
});

const RenderMetricsSchema = Schema.Record(Schema.String, RenderReportSchema);

export type RenderReport = typeof RenderReportSchema.Type;

export type RenderMetrics = typeof RenderMetricsSchema.Type;

const decodeRenderReport = Schema.decodeUnknownSync(
  Schema.fromJsonString(RenderReportSchema),
);

const decodeRenderMetrics = Schema.decodeUnknownSync(
  Schema.fromJsonString(RenderMetricsSchema),
);

const appDirectory = path.resolve(import.meta.dirname, "../..");

const runScenarios = (): RenderMetrics => {
  const directory = mkdtempSync(path.join(tmpdir(), "lootlog-renders-"));

  try {
    const result = spawnSync(
      "bunx",
      ["vitest", "run", "--config", "vitest.renders.config.ts"],
      {
        cwd: appDirectory,
        env: { ...process.env, [RENDER_METRICS_DIRECTORY_ENV]: directory },
        stdio: ["ignore", "inherit", "inherit"],
      },
    );

    if (result.status !== 0)
      throw new Error(`Render scenarios failed with exit ${result.status}`);

    return Object.fromEntries(
      readdirSync(directory)
        .filter((file) => file.endsWith(".json"))
        .toSorted()
        .map((file) => [
          path.basename(file, ".json"),
          decodeRenderReport(readFileSync(path.join(directory, file), "utf8")),
        ]),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

export const findUnstableScenarios = (runs: readonly RenderMetrics[]) => {
  const [first, ...rest] = runs;

  if (!first) return [];
  const scenarios = new Set(runs.flatMap((run) => Object.keys(run)));

  return [...scenarios].filter((scenario) =>
    rest.some(
      (run) =>
        JSON.stringify(run[scenario]) !== JSON.stringify(first[scenario]),
    ),
  );
};

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

const formatChange = (before: number, after: number) => {
  if (before === after) return `${after}`;

  const percent =
    before === 0
      ? ""
      : `, ${signed(Math.round(((after - before) / before) * 100))}%`;

  return `${before} → ${after} (${signed(after - before)}${percent})`;
};

const EMPTY_REPORT: RenderReport = { commits: 0, renders: 0, components: {} };

export const formatRenderComparison = (
  before: RenderMetrics,
  after: RenderMetrics,
  top = 10,
) => {
  const scenarios = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ].toSorted();

  const lines = [
    "### Render scenarios",
    "",
    "| scenario | commits | renders |",
    "| :-- | --: | --: |",
    ...scenarios.map((scenario) => {
      const a = before[scenario] ?? EMPTY_REPORT;
      const b = after[scenario] ?? EMPTY_REPORT;

      return `| ${scenario} | ${formatChange(a.commits, b.commits)} | ${formatChange(a.renders, b.renders)} |`;
    }),
  ];

  for (const scenario of scenarios) {
    const a = before[scenario]?.components ?? {};
    const b = after[scenario]?.components ?? {};

    const changed = [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .flatMap((name) => {
        const entry = { name, before: a[name] ?? 0, after: b[name] ?? 0 };

        return entry.before === entry.after ? [] : [entry];
      })
      .toSorted(
        (x, y) =>
          Math.abs(y.after - y.before) - Math.abs(x.after - x.before) ||
          x.name.localeCompare(y.name),
      )
      .slice(0, top);

    if (changed.length === 0) continue;
    lines.push(
      "",
      `#### ${scenario}: components that changed most`,
      "",
      "| component | renders |",
      "| :-- | --: |",
      ...changed.map(
        (entry) =>
          `| \`${entry.name}\` | ${formatChange(entry.before, entry.after)} |`,
      ),
    );
  }

  return lines.join("\n");
};

const readOption = (args: readonly string[], name: string) => {
  const index = args.indexOf(name);

  return index === -1 ? undefined : args[index + 1];
};

const readMetrics = (file: string) =>
  decodeRenderMetrics(readFileSync(file, "utf8"));

const run = (args: readonly string[]) => {
  const runs = Number(readOption(args, "--runs") ?? 3);
  const results = Array.from({ length: runs }, runScenarios);
  const unstable = findUnstableScenarios(results);

  if (unstable.length > 0) {
    const [first = {}, ...rest] = results;

    const pickUnstable = (metrics: RenderMetrics) =>
      Object.fromEntries(
        unstable.flatMap((scenario) => {
          const report = metrics[scenario];

          return report ? [[scenario, report]] : [];
        }),
      );

    process.stderr.write(
      `Counts differed between runs: ${unstable.join(", ")}\n`,
    );

    for (const [index, result] of rest.entries())
      process.stderr.write(
        `\nRun 1 → run ${index + 2}\n${formatRenderComparison(pickUnstable(first), pickUnstable(result))}\n`,
      );

    process.exitCode = 1;

    return;
  }

  const json = `${JSON.stringify(results[0], null, 2)}\n`;
  const out = readOption(args, "--out");

  if (out) writeFileSync(out, json);
  else process.stdout.write(json);
  process.stderr.write(`${runs} run(s) produced identical counts.\n`);
};

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  const [beforeFile, afterFile] = args;

  if (command === "run") run(args);
  else if (command === "compare" && beforeFile && afterFile)
    process.stdout.write(
      `${formatRenderComparison(
        readMetrics(beforeFile),
        readMetrics(afterFile),
        Number(readOption(args, "--top") ?? 10),
      )}\n`,
    );
  else {
    process.stdout.write(`${HELP}\n`);

    if (command !== undefined && command !== "--help") process.exitCode = 1;
  }
}
