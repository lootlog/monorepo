import { totalmem } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";

import { createDeploymentPlan } from "./deployment-targets.mjs";

const repositoryRoot = join(import.meta.dir, "..");

const cachePath = join(
  repositoryRoot,
  "node_modules/.cache/check-changed.json",
);

const GiB = 1024 ** 3;

const codeFile = /\.[cm]?[jt]sx?$/u;

const testFile = /\.test\.[cm]?[jt]sx?$/u;

const ciOnlyTestFile = /\.(?:integration|e2e)\./u;

const workspaceFile = /^(?:apps|packages)\/[^/]+\//u;

const migrationWorkspaces = [
  "@lootlog/activity",
  "@lootlog/api",
  "@lootlog/auth",
  "@lootlog/battlelog",
  "@lootlog/catalog",
];

export type Workspace = {
  readonly name: string;
  readonly directory: string;
  readonly testScript: string | undefined;
};

export type CiPlan = {
  readonly packages: readonly string[];
  readonly integrationPackages: readonly string[];
  readonly runClientCheck: boolean;
  readonly dockerTargets: readonly { readonly id: string }[];
};

export type StepSpec = {
  readonly name: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly weight: number;
};

export type CheckPlan = {
  readonly steps: readonly StepSpec[];
  readonly leftToCi: readonly string[];
};

export const defaultConcurrency = (cores: number, memoryBytes: number) =>
  Math.max(
    1,
    Math.min(Math.floor(cores / 2), Math.floor(memoryBytes / (6 * GiB))),
  );

export function selectTestFiles(
  files: readonly string[],
  listDirectory: (directory: string) => readonly string[],
): string[] {
  const tests = new Set(files.filter((file) => testFile.test(file)));

  for (const file of files.filter((file) => codeFile.test(file))) {
    const prefix = `${basename(file).replace(codeFile, "")}.`;
    const directory = dirname(file);

    for (const entry of listDirectory(directory)) {
      if (entry.startsWith(prefix) && testFile.test(entry)) {
        tests.add(join(directory, entry));
      }
    }
  }

  return [...tests].toSorted();
}

function testCommand(workspace: Workspace, files: readonly string[]) {
  const script = workspace.testScript ?? "";
  const paths = files.map((file) => `./${relative(workspace.directory, file)}`);

  if (/\bvitest\b/u.test(script)) {
    const config = /--config[= ](\S+)/u.exec(script)?.[1];

    return [
      "bunx",
      "vitest",
      "run",
      ...(config ? ["--config", config] : []),
      ...paths,
    ];
  }

  if (!/\bbun\b(?:\s+--\S+)*\s+test\b/u.test(script)) return undefined;

  const conditions = /--conditions=\S+/u.exec(script)?.[0];
  const timeout = /--timeout=\S+/u.exec(script)?.[0];

  return [
    "bun",
    ...(conditions ? [conditions] : []),
    "test",
    ...(timeout ? [timeout] : []),
    ...paths,
  ];
}

export function planChecks(input: {
  readonly files: readonly string[];
  readonly present: readonly string[];
  readonly tests: readonly string[];
  readonly workspaces: readonly Workspace[];
  readonly ciPlan: CiPlan;
  readonly concurrency: number;
}): CheckPlan {
  const { files, present, tests, workspaces, ciPlan, concurrency } = input;

  const step = (
    name: string,
    argv: readonly string[],
    cwd = repositoryRoot,
    weight = 1,
  ) => ({
    name,
    argv,
    cwd,
    weight,
  });

  const steps: StepSpec[] = [];
  const leftToCi: string[] = [];

  if (ciPlan.packages.length > 0) {
    const workers = Math.min(concurrency, ciPlan.packages.length * 2);

    steps.push(
      step(
        `lint + typecheck (${ciPlan.packages.length} packages)`,
        [
          "bunx",
          "turbo",
          "run",
          "lint",
          "typecheck",
          `--concurrency=${workers}`,
          "--continue",
          "--output-logs=errors-only",
          ...ciPlan.packages.map((name) => `--filter=${name}`),
        ],
        repositoryRoot,
        workers,
      ),
    );
  }

  if (present.length > 0) {
    steps.push(
      step("format", [
        "bunx",
        "oxfmt",
        "--check",
        "--no-error-on-unmatched-pattern",
        ...present,
      ]),
    );
  }

  const repositoryCode = (file: string) =>
    file.startsWith("scripts/") ||
    (file.startsWith("tools/oxlint/") &&
      !file.startsWith("tools/oxlint/anti-slop/"));

  const presentRepositoryCode = present.filter(
    (file) => repositoryCode(file) && codeFile.test(file),
  );

  if (presentRepositoryCode.length > 0) {
    steps.push(
      step("lint repository scripts", [
        "bunx",
        "oxlint",
        ...presentRepositoryCode,
      ]),
    );
  }

  steps.push(step("test scripts", ["bun", "test", "./scripts"]));

  if (files.some((file) => file.startsWith("tools/oxlint/lootlog/"))) {
    steps.push(
      step("test lint rules", [
        "node",
        "--test",
        "tools/oxlint/lootlog/*.node-test.ts",
      ]),
    );
  }

  steps.push(step("knip", ["bun", "run", "knip"]));
  steps.push(step("lint ratchet", ["bun", "run", "lint:ratchet"]));

  if (ciPlan.runClientCheck) {
    steps.push(
      step(
        "generated client",
        ["bun", "run", "client:check"],
        repositoryRoot,
        concurrency,
      ),
    );
    leftToCi.push("SDK package installation");
  }

  const workspaceTests = tests.filter((file) => workspaceFile.test(file));

  for (const file of workspaceTests.filter((file) =>
    ciOnlyTestFile.test(file),
  )) {
    leftToCi.push(file);
  }

  const byWorkspace = Map.groupBy(
    workspaceTests.filter((file) => !ciOnlyTestFile.test(file)),
    (file) =>
      workspaces.find(({ directory }) => file.startsWith(`${directory}/`)),
  );

  for (const [workspace, workspaceFiles] of byWorkspace) {
    const argv = workspace && testCommand(workspace, workspaceFiles);

    if (!workspace || !argv) {
      leftToCi.push(...workspaceFiles);
      continue;
    }

    steps.push(
      step(
        `test ${workspace.name} (${workspaceFiles.length} files)`,
        argv,
        join(repositoryRoot, workspace.directory),
      ),
    );
  }

  if (ciPlan.packages.length > 0) {
    leftToCi.push(
      `full test, test:e2e and build of ${ciPlan.packages.length} packages`,
    );
  }

  if (ciPlan.integrationPackages.length > 0) {
    leftToCi.push(
      `integration tests of ${ciPlan.integrationPackages.join(", ")}`,
    );
  }

  if (ciPlan.packages.some((name) => migrationWorkspaces.includes(name))) {
    leftToCi.push("migration drift check");
  }

  if (ciPlan.dockerTargets.length > 0) {
    leftToCi.push(
      `Docker images ${ciPlan.dockerTargets.map(({ id }) => id).join(", ")}`,
    );
  }

  if (files.some((file) => file.startsWith(".github/workflows/"))) {
    leftToCi.push("actionlint");
  }

  return { steps, leftToCi };
}

const environmentWithoutGitHookVariables = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

const stepEnvironment = process.stdout.isTTY
  ? { ...environmentWithoutGitHookVariables, FORCE_COLOR: "1" }
  : environmentWithoutGitHookVariables;

const print = (text: string) => process.stdout.write(`${text}\n`);

export type Outcome = "pass" | "FAIL" | "TIMEOUT";

type StepResult = {
  readonly name: string;
  readonly outcome: Outcome;
  readonly time: string;
};

async function execute(
  step: StepSpec,
  timeoutSeconds: number,
): Promise<StepResult> {
  const started = performance.now();

  const child = Bun.spawn(["sh", "-c", 'exec "$@" 2>&1', "sh", ...step.argv], {
    cwd: step.cwd,
    env: stepEnvironment,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "ignore",
    detached: true,
  });

  let timedOut = false;

  const killGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid, signal);
    } catch {}
  };

  const timer = setTimeout(() => {
    timedOut = true;
    killGroup("SIGTERM");
    setTimeout(() => killGroup("SIGKILL"), 5000).unref();
  }, timeoutSeconds * 1000);

  const [output, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    child.exited,
  ]);

  clearTimeout(timer);

  const outcome: Outcome = timedOut
    ? "TIMEOUT"
    : exitCode === 0
      ? "pass"
      : "FAIL";

  const time = timedOut
    ? `killed after ${timeoutSeconds}s`
    : `${((performance.now() - started) / 1000).toFixed(1)}s`;

  print(`\n> ${step.name}  ${outcome}  ${time}`);

  if (output.trim()) print(output.trimEnd());

  return { name: step.name, outcome, time };
}

async function runSteps(
  steps: readonly StepSpec[],
  options: { readonly concurrency: number; readonly timeoutSeconds: number },
) {
  let free = options.concurrency;
  let released = Promise.withResolvers<void>();
  const running: Promise<StepResult>[] = [];

  for (const step of steps) {
    const slots = Math.min(step.weight, options.concurrency);

    while (free < slots) await released.promise;
    free -= slots;
    running.push(
      execute(step, options.timeoutSeconds).finally(() => {
        free += slots;
        const current = released;
        released = Promise.withResolvers<void>();
        current.resolve();
      }),
    );
  }

  return Promise.all(running);
}

const git = (args: readonly string[]) =>
  Bun.$`git -c core.quotePath=false ${args}`.cwd(repositoryRoot).quiet();

const gitList = async (args: readonly string[]) =>
  (await git(args).text()).split("\0").filter(Boolean);

async function comparisonBase(explicitRef: string | undefined) {
  const remotes = (await git(["remote"]).text()).split("\n").filter(Boolean);

  const candidates = explicitRef
    ? [explicitRef]
    : [...remotes.map((remote) => `${remote}/main`), "main"];

  let closest: { ref: string; base: string; ahead: number } | undefined;

  for (const ref of candidates) {
    const result = await git(["merge-base", "HEAD", ref]).nothrow();

    if (result.exitCode !== 0) continue;
    const base = result.text().trim();

    const ahead = Number(
      (await git(["rev-list", "--count", `${base}..HEAD`]).text()).trim(),
    );

    if (!closest || ahead < closest.ahead) closest = { ref, base, ahead };
  }

  if (!closest) {
    throw new Error(
      `check:changed: no merge base with ${candidates.join(", ") || "a remote main"}. Run git fetch or pass a ref.`,
    );
  }

  return closest;
}

async function changedFiles(base: string) {
  const [tracked, untracked] = await Promise.all([
    gitList(["diff", "--name-only", "-z", "--no-renames", base, "--"]),
    gitList(["ls-files", "-z", "--others", "--exclude-standard"]),
  ]);

  return {
    tracked,
    untracked,
    files: [...new Set([...tracked, ...untracked])].toSorted(),
  };
}

async function inputKey(base: string) {
  const hasher = new Bun.CryptoHasher("sha256");
  const { files } = await changedFiles(base);

  hasher.update(`${Bun.version}\0${base}\0${process.env.CI ?? ""}\0`);
  hasher.update(
    await git([
      "diff",
      "--binary",
      "--no-renames",
      "--no-ext-diff",
      "--no-textconv",
      base,
      "--",
    ]).arrayBuffer(),
  );

  for (const file of files) {
    hasher.update(`\0${file}\0`);
    const handle = Bun.file(join(repositoryRoot, file));

    if (await handle.exists()) hasher.update(await handle.arrayBuffer());
  }

  return hasher.digest("hex");
}

async function readWorkspaces(): Promise<Workspace[]> {
  const workspaces: Workspace[] = [];

  for await (const path of new Bun.Glob("{apps,packages}/*/package.json").scan(
    repositoryRoot,
  )) {
    const manifest = await Bun.file(join(repositoryRoot, path)).json();

    workspaces.push({
      name: manifest.name,
      directory: dirname(path),
      testScript: manifest.scripts?.test,
    });
  }

  return workspaces;
}

async function affectedPackages(base: string): Promise<string[]> {
  const result =
    await Bun.$`bunx turbo query affected --base ${base} --packages`
      .cwd(repositoryRoot)
      .quiet()
      .json();

  return result.data.affectedPackages.items.map(
    ({ name }: { name: string }) => name,
  );
}

function positiveInteger(name: string, value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`check:changed: ${name} must be a positive integer.`);
  }

  return parsed;
}

async function checkChanged(argv: readonly string[]) {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: { concurrency: { type: "string" }, timeout: { type: "string" } },
  });

  const concurrency =
    positiveInteger(
      "--concurrency",
      values.concurrency ?? process.env.CHECK_CHANGED_CONCURRENCY,
    ) ?? defaultConcurrency(navigator.hardwareConcurrency, totalmem());

  const timeoutSeconds =
    positiveInteger(
      "--timeout",
      values.timeout ?? process.env.CHECK_CHANGED_TIMEOUT,
    ) ?? 900;

  const { ref, base } = await comparisonBase(positionals[0]);
  const { files } = await changedFiles(base);
  const label = `${base.slice(0, 12)} (${ref})`;

  if (files.length === 0) {
    print(`check:changed: no changes since ${label}.`);

    return true;
  }

  print(`check:changed: ${files.length} files since ${label}`);

  const key = await inputKey(base);

  const cached = await Bun.file(cachePath)
    .json()
    .catch(() => undefined);

  if (cached?.key === key && Array.isArray(cached.summary)) {
    print("Nothing changed since the last passing run.\n");
    print(cached.summary.join("\n"));

    return true;
  }

  const presence = await Promise.all(
    files.map(async (file) =>
      (await Bun.file(join(repositoryRoot, file)).exists()) ? file : undefined,
    ),
  );

  const present = presence.filter((file) => file !== undefined);
  const directories = new Map<string, readonly string[]>();
  const listDirectory = (directory: string) => directories.get(directory) ?? [];

  for (const directory of new Set(files.map((file) => dirname(file)))) {
    directories.set(
      directory,
      await Array.fromAsync(
        new Bun.Glob("*").scan(join(repositoryRoot, directory)),
      ).catch(() => []),
    );
  }

  const [workspaces, affected] = await Promise.all([
    readWorkspaces(),
    affectedPackages(base),
  ]);

  const ciPlan = await createDeploymentPlan({
    mode: "ci",
    affectedPackages: affected,
    changedFiles: files,
  });

  if (!("packages" in ciPlan)) throw new Error("CI planning returned no plan");

  const { steps, leftToCi } = planChecks({
    files,
    present,
    tests: selectTestFiles(files, listDirectory),
    workspaces,
    ciPlan,
    concurrency,
  });

  const results = await runSteps(steps, { concurrency, timeoutSeconds });

  const summary = [
    "check:changed summary",
    ...results.map(
      ({ name, outcome, time }) => `  ${outcome}  ${name}  ${time}`,
    ),
  ];

  if (results.some(({ outcome }) => outcome === "TIMEOUT")) {
    summary.push(
      `  TIMEOUT: ran past ${timeoutSeconds}s and was killed; this is not a check failure. Raise --timeout or lower --concurrency.`,
    );
  }

  if (leftToCi.length > 0) {
    summary.push("  left to CI:", ...leftToCi.map((item) => `    ${item}`));
  }

  print(`\n${summary.join("\n")}`);

  if (results.some(({ outcome }) => outcome !== "pass")) return false;

  if ((await inputKey(base)) !== key) {
    print("  pass not cached: files changed during the run");

    return true;
  }

  await Bun.write(cachePath, JSON.stringify({ key, summary }));

  return true;
}

if (import.meta.main) {
  try {
    if (!(await checkChanged(Bun.argv.slice(2)))) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
