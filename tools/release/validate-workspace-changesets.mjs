import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const releaseNeutralWorkspaceMetadata = new Set([
  "AGENTS.md",
  "PRODUCT.md",
  "README.md",
]);

function hasReleaseAffectingChange(changedFiles, workspacePath) {
  const workspacePrefix = `${workspacePath}/`;

  return changedFiles.some((changedFile) => {
    if (changedFile === workspacePath) {
      return true;
    }
    if (!changedFile.startsWith(workspacePrefix)) {
      return false;
    }

    const workspaceRelativePath = changedFile.slice(workspacePrefix.length);
    return !releaseNeutralWorkspaceMetadata.has(workspaceRelativePath);
  });
}

export function findUncoveredWorkspaces({
  changedFiles,
  changesetFiles,
  releases,
  workspaces,
}) {
  const hasEmptyChangeset = changesetFiles.some(({ content, path }) => {
    if (!path.startsWith(".changeset/") || !path.endsWith(".md")) {
      return false;
    }

    const lines = content.split(/\r?\n/);
    if (lines[0] !== "---") {
      return false;
    }

    const closingDelimiter = lines.indexOf("---", 1);
    return (
      closingDelimiter !== -1 &&
      lines.slice(1, closingDelimiter).every((line) => line.trim() === "")
    );
  });

  if (hasEmptyChangeset) {
    return [];
  }

  const releasedPackages = new Set(releases.map(({ name }) => name));

  return workspaces
    .filter(({ path }) => hasReleaseAffectingChange(changedFiles, path))
    .filter(({ name }) => !releasedPackages.has(name))
    .map(({ name }) => name)
    .sort();
}

function runCommand(command, arguments_, cwd) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const error = new Error(`Command failed: ${command}`);
    error.exitCode = result.status ?? 1;
    error.stderr = result.stderr;
    error.stdout = result.stdout;
    throw error;
  }

  return result.stdout.trim();
}

function readWorkspaces(cwd) {
  return ["apps", "packages"].flatMap((scope) => {
    const scopeDirectory = join(cwd, scope);
    if (!existsSync(scopeDirectory)) {
      return [];
    }

    return readdirSync(scopeDirectory, { withFileTypes: true }).flatMap(
      (entry) => {
        if (!entry.isDirectory()) {
          return [];
        }

        const path = `${scope}/${entry.name}`;
        const packageJsonPath = join(cwd, path, "package.json");
        if (!existsSync(packageJsonPath)) {
          return [];
        }

        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return [{ name: packageJson.name, path }];
      },
    );
  });
}

function validateWorkspaceChangesets(baseRef, cwd) {
  const changedFiles = runCommand(
    "git",
    ["diff", "--name-only", `${baseRef}...HEAD`, "--"],
    cwd,
  )
    .split("\n")
    .filter(Boolean);
  const changesetFiles = changedFiles
    .filter(
      (changedFile) =>
        changedFile.startsWith(".changeset/") &&
        changedFile.endsWith(".md") &&
        existsSync(join(cwd, changedFile)),
    )
    .map((path) => ({
      content: readFileSync(join(cwd, path), "utf8"),
      path,
    }));
  const statusFile = join(
    tmpdir(),
    `lootlog-changeset-status-${randomUUID()}.json`,
  );

  try {
    runCommand(
      "bunx",
      ["changeset", "status", `--since=${baseRef}`, `--output=${statusFile}`],
      cwd,
    );

    const { releases } = JSON.parse(readFileSync(statusFile, "utf8"));
    const uncoveredWorkspaces = findUncoveredWorkspaces({
      changedFiles,
      changesetFiles,
      releases,
      workspaces: readWorkspaces(cwd),
    });

    if (uncoveredWorkspaces.length > 0) {
      process.stderr.write(
        [
          "Changed workspaces missing from the Changesets release plan:",
          ...uncoveredWorkspaces.map((workspace) => `- ${workspace}`),
          "",
          "Add every workspace to a changeset, or use `bunx changeset --empty` when no release is required.",
          "",
        ].join("\n"),
      );
      process.exitCode = 1;
    }
  } finally {
    rmSync(statusFile, { force: true });
  }
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const baseRef = process.argv[2];
  if (!baseRef) {
    process.stderr.write(
      "Usage: validate-workspace-changesets.mjs <base-ref>\n",
    );
    process.exitCode = 1;
  } else {
    try {
      validateWorkspaceChangesets(baseRef, process.cwd());
    } catch (error) {
      if (error.stdout) {
        process.stdout.write(error.stdout);
      }
      process.stderr.write(error.stderr || `${error.message}\n`);
      process.exitCode = error.exitCode ?? 1;
    }
  }
}
