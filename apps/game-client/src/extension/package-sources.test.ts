import { afterEach, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function repository() {
  const root = await mkdtemp(path.join(tmpdir(), "lootlog-source-archive-"));
  directories.push(root);
  const client = path.join(root, "apps/game-client");
  await mkdir(path.join(client, "extension"), { recursive: true });
  await copyFile(
    path.resolve(import.meta.dirname, "../../extension/package-sources.ts"),
    path.join(client, "extension/package-sources.ts"),
  );
  await writeFile(
    path.join(client, "package.json"),
    JSON.stringify({ version: "1.0.0", type: "module" }),
  );
  await writeFile(
    path.join(root, ".gitignore"),
    "node_modules\n.output/\n.env\n",
  );
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ],
    { cwd: root },
  );
  await symlink(
    path.resolve(import.meta.dirname, "../../node_modules"),
    path.join(client, "node_modules"),
    "dir",
  );
  const archive = path.join(
    client,
    ".output/lootlog-game-client-1.0.0-sources.zip",
  );
  const run = () =>
    spawnSync("bun", [path.join(client, "extension/package-sources.ts")], {
      cwd: client,
      encoding: "utf8",
    });
  return { root, client, archive, run };
}

it("packages a clean checkout even with ignored local configuration", async () => {
  const fixture = await repository();
  await writeFile(
    path.join(fixture.client, ".env"),
    "PRIVATE_FIXTURE_VALUE=not-for-reviewers",
  );
  const result = fixture.run();
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect((await readFile(fixture.archive)).subarray(0, 2).toString()).toBe(
    "PK",
  );
});

it.each(["untracked", "modified", "staged"])(
  "refuses %s source changes before writing an archive",
  async (state) => {
    const fixture = await repository();
    const file =
      state === "untracked" ? "debug.ts" : "extension/package-sources.ts";
    const target = path.join(fixture.client, file);
    const existing =
      state === "untracked" ? "" : await readFile(target, "utf8");
    await writeFile(target, existing + "\n// PRIVATE_FIXTURE_VALUE\n");
    if (state === "staged")
      execFileSync("git", ["add", "."], { cwd: fixture.root });
    const result = fixture.run();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Source packaging requires a clean Git worktree",
    );
    await expect(readFile(fixture.archive)).rejects.toMatchObject({
      code: "ENOENT",
    });
  },
);
