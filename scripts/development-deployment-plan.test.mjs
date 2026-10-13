import { expect, onTestFinished, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");

const workflow = Bun.YAML.parse(
  await Bun.file(
    join(repositoryRoot, ".github/workflows/dev-deploy.yml"),
  ).text(),
);

const planStep = workflow.jobs.plan.steps.find(({ id }) => id === "plan");

async function command(directory, arguments_, env = {}) {
  const subprocess = Bun.spawn(arguments_, {
    cwd: directory,
    env: { ...Bun.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);

  if (exitCode !== 0) throw new Error(stderr || stdout);

  return stdout.trim();
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "lootlog-dev-deploy-"));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  for (const path of [
    ".github/deployment-targets.json",
    "scripts/deployment-targets.mjs",
    "scripts/deployment-input.ts",
    "scripts/development-deployment-base.mjs",
  ]) {
    const source = Bun.file(join(repositoryRoot, path));

    await Bun.write(join(directory, path), source);
  }

  await Bun.write(
    join(directory, "package.json"),
    JSON.stringify({
      name: "deployment-regression",
      packageManager: "bun@1.4.2",
      workspaces: ["apps/*"],
    }),
  );

  for (const name of ["api", "web"]) {
    await Bun.write(
      join(directory, `apps/${name}/package.json`),
      JSON.stringify({ name: `@lootlog/${name}` }),
    );
    await Bun.write(
      join(directory, `apps/${name}/src/index.ts`),
      "export {};\n",
    );
  }

  await Bun.write(join(directory, "turbo.json"), "{}\n");
  await command(directory, [
    "bun",
    "install",
    "--lockfile-only",
    "--ignore-scripts",
  ]);
  await command(directory, ["git", "init", "-b", "main"]);
  await command(directory, ["git", "config", "user.name", "Deployment test"]);
  await command(directory, [
    "git",
    "config",
    "user.email",
    "test@example.invalid",
  ]);
  await command(directory, ["git", "add", "."]);
  await command(directory, ["git", "commit", "-m", "initial deployment"]);
  const baseSha = await command(directory, ["git", "rev-parse", "HEAD"]);
  await Bun.write(
    join(directory, "apps/web/src/index.ts"),
    "export const web = 1;\n",
  );
  await command(directory, ["git", "commit", "-am", "change web"]);
  const previousSha = await command(directory, ["git", "rev-parse", "HEAD"]);
  await Bun.write(
    join(directory, "apps/api/src/index.ts"),
    "export const api = 1;\n",
  );
  await command(directory, ["git", "commit", "-am", "change api"]);
  const headSha = await command(directory, ["git", "rev-parse", "HEAD"]);

  return { directory, baseSha, previousSha, headSha };
}

async function plan({ directory, previousSha, headSha }, runs, status = 200) {
  const server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const url = new URL(request.url);

      if (
        url.pathname !==
          "/repos/lootlog/monorepo/actions/workflows/dev-deploy.yml/runs" ||
        url.searchParams.get("branch") !== "main" ||
        url.searchParams.get("event") !== "push" ||
        !["success", "completed"].includes(url.searchParams.get("status")) ||
        request.headers.get("Authorization") !== "Bearer deployment-test-token"
      ) {
        return new Response("Unsupported workflow history request", {
          status: 400,
        });
      }

      const matchingRuns =
        url.searchParams.get("status") === "success"
          ? runs.filter(({ conclusion }) => conclusion === "success")
          : runs;

      return Response.json({ workflow_runs: matchingRuns }, { status });
    },
  });

  onTestFinished(() => server.stop(true));
  const outputPath = join(directory, "output");
  await command(
    directory,
    ["bash", "-e", "-o", "pipefail", "-c", planStep.run],
    {
      BASE_SHA: previousSha,
      HEAD_SHA: headSha,
      GH_TOKEN: "deployment-test-token",
      GITHUB_REPOSITORY: "lootlog/monorepo",
      GITHUB_API_URL: server.url.origin,
      GITHUB_OUTPUT: outputPath,
      GITHUB_STEP_SUMMARY: join(directory, "summary"),
      PATH: `${repositoryRoot}/node_modules/.bin:${Bun.env.PATH}`,
      TURBO_TELEMETRY_DISABLED: "1",
    },
  );
  const output = await Bun.file(outputPath).text();

  const targets = output
    .split("\n")
    .find((line) => line.startsWith("targets="));

  return JSON.parse(targets.slice("targets=".length)).map(({ id }) => id);
}

test("dev catches up changes from a skipped push", async () => {
  const checkout = await fixture();
  expect(
    await plan(checkout, [
      { head_sha: checkout.baseSha, conclusion: "success" },
    ]),
  ).toEqual(["api", "web"]);
}, 30_000);

test("dev does not redeploy a target whose previous push succeeded", async () => {
  const checkout = await fixture();
  expect(
    await plan(checkout, [
      { head_sha: checkout.previousSha, conclusion: "success" },
    ]),
  ).toEqual(["api"]);
}, 30_000);

test.each([
  { name: "empty deployment history", runs: [] },
  {
    name: "an unavailable baseline commit",
    runs: [{ head_sha: "0".repeat(40), conclusion: "success" }],
  },
])(
  "dev bootstraps unchanged enabled targets for $name",
  async ({ runs }) => {
    const checkout = await fixture();
    const targets = await plan(checkout, runs);

    expect(targets).toContain("auth");
    expect(targets).toContain("web");
    expect(targets).not.toContain("wiki");
  },
  30_000,
);

test("dev fails closed when deployment history cannot be read", async () => {
  const checkout = await fixture();
  await expect(plan(checkout, [], 403)).rejects.toThrow("403");
}, 30_000);

test("dev rejects an old rerun after a newer revision was deployed", async () => {
  const checkout = await fixture();
  await expect(
    plan({ ...checkout, headSha: checkout.previousSha }, [
      { head_sha: checkout.headSha, conclusion: "success" },
    ]),
  ).rejects.toThrow("A newer development deployment run already completed");
}, 30_000);

test.each(["failure", "cancelled"])(
  "dev restores a reverted target after a partial deployment ended with %s",
  async (conclusion) => {
    const checkout = await fixture();
    await Bun.write(
      join(checkout.directory, "apps/web/src/index.ts"),
      "export {};\n",
    );
    await command(checkout.directory, [
      "git",
      "commit",
      "-am",
      "revert web after partial deployment",
    ]);

    const headSha = await command(checkout.directory, [
      "git",
      "rev-parse",
      "HEAD",
    ]);

    const targets = await plan({ ...checkout, headSha }, [
      { head_sha: checkout.headSha, conclusion },
      { head_sha: checkout.baseSha, conclusion: "success" },
    ]);

    expect(targets).toContain("web");
    expect(targets).toContain("api");
  },
  30_000,
);
