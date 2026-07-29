import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const APP_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(APP_DIRECTORY, "../..");
const COVERAGE_PATH = path.join(APP_DIRECTORY, "coverage/coverage-final.json");
const GIT_OUTPUT_BUFFER_SIZE = 64 * 1024 * 1024;

function runGit(arguments_) {
  const result = spawnSync("git", arguments_, {
    cwd: REPOSITORY_DIRECTORY,
    encoding: "utf8",
    maxBuffer: GIT_OUTPUT_BUFFER_SIZE,
  });
  if (result.status !== 0) {
    const errorMessage = result.error?.message ?? result.stderr.trim();
    throw new Error(errorMessage || `git ${arguments_.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function resolveBaseReference() {
  if (process.env.COVERAGE_BASE_REF) {
    return process.env.COVERAGE_BASE_REF;
  }

  for (const candidate of ["origin/main", "HEAD^"]) {
    const result = spawnSync("git", ["rev-parse", "--verify", candidate], {
      cwd: REPOSITORY_DIRECTORY,
      encoding: "utf8",
    });
    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error(
    "Set COVERAGE_BASE_REF to a commit available in this checkout",
  );
}

function isProductionSource(filePath) {
  return (
    filePath.startsWith("apps/game-client/src/") &&
    /\.(?:ts|tsx)$/.test(filePath) &&
    !/\.(?:bench|test|spec)\.(?:ts|tsx)$/.test(filePath) &&
    !filePath.endsWith(".d.ts") &&
    !filePath.includes("/lib/api/generated/") &&
    !filePath.includes("/test/")
  );
}

export function parseChangedLines(diff) {
  const changedLines = new Map();
  let currentFile;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      const candidate = line.slice(6);
      currentFile = isProductionSource(candidate) ? candidate : undefined;
      continue;
    }

    if (!currentFile || !line.startsWith("@@")) {
      continue;
    }

    const match = line.match(/\+(\d+)(?:,(\d+))?/);
    if (!match) {
      continue;
    }

    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    if (count === 0) {
      continue;
    }

    let fileLines = changedLines.get(currentFile);
    if (!fileLines) {
      fileLines = new Set();
      changedLines.set(currentFile, fileLines);
    }
    for (let lineNumber = start; lineNumber < start + count; lineNumber += 1) {
      fileLines.add(lineNumber);
    }
  }

  return changedLines;
}

function includeUntrackedProductionFiles(changedLines) {
  const untrackedFiles = runGit([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "apps/game-client/src",
  ]);

  if (!untrackedFiles) {
    return changedLines;
  }

  for (const filePath of untrackedFiles.split("\n")) {
    if (!isProductionSource(filePath)) {
      continue;
    }

    const source = readFileSync(
      path.join(REPOSITORY_DIRECTORY, filePath),
      "utf8",
    );
    const lineCount = source.split("\n").length;
    changedLines.set(
      filePath,
      new Set(Array.from({ length: lineCount }, (_value, index) => index + 1)),
    );
  }

  return changedLines;
}

function rangeTouchesChangedLine(location, changedLines) {
  if (!location?.start?.line || !location?.end?.line) {
    return false;
  }

  for (
    let lineNumber = location.start.line;
    lineNumber <= location.end.line;
    lineNumber += 1
  ) {
    if (changedLines.has(lineNumber)) {
      return true;
    }
  }
  return false;
}

function createCounter() {
  return { covered: 0, total: 0 };
}

export function calculateChangedCoverage(coverage, changedLinesByFile) {
  const counters = {
    branches: createCounter(),
    functions: createCounter(),
    lines: createCounter(),
    statements: createCounter(),
  };

  for (const [coverageFilePath, fileCoverage] of Object.entries(coverage)) {
    const relativeFilePath = path
      .relative(REPOSITORY_DIRECTORY, coverageFilePath)
      .split(path.sep)
      .join("/");
    const changedLines = changedLinesByFile.get(relativeFilePath);
    if (!changedLines) {
      continue;
    }

    const lineExecutions = new Map();
    for (const [statementId, location] of Object.entries(
      fileCoverage.statementMap,
    )) {
      if (!rangeTouchesChangedLine(location, changedLines)) {
        continue;
      }
      const executionCount = fileCoverage.s[statementId] ?? 0;
      counters.statements.total += 1;
      counters.statements.covered += executionCount > 0 ? 1 : 0;

      for (
        let lineNumber = location.start.line;
        lineNumber <= location.end.line;
        lineNumber += 1
      ) {
        if (changedLines.has(lineNumber)) {
          lineExecutions.set(
            lineNumber,
            Math.max(lineExecutions.get(lineNumber) ?? 0, executionCount),
          );
        }
      }
    }

    counters.lines.total += lineExecutions.size;
    counters.lines.covered += [...lineExecutions.values()].filter(
      (executionCount) => executionCount > 0,
    ).length;

    for (const [functionId, metadata] of Object.entries(fileCoverage.fnMap)) {
      if (!rangeTouchesChangedLine(metadata.loc, changedLines)) {
        continue;
      }
      counters.functions.total += 1;
      counters.functions.covered +=
        (fileCoverage.f[functionId] ?? 0) > 0 ? 1 : 0;
    }

    for (const [branchId, metadata] of Object.entries(fileCoverage.branchMap)) {
      const executions = fileCoverage.b[branchId] ?? [];
      metadata.locations.forEach((location, locationIndex) => {
        if (!rangeTouchesChangedLine(location, changedLines)) {
          return;
        }
        counters.branches.total += 1;
        counters.branches.covered +=
          (executions[locationIndex] ?? 0) > 0 ? 1 : 0;
      });
    }
  }

  return counters;
}

function percentage(counter) {
  return counter.total === 0 ? 100 : (counter.covered / counter.total) * 100;
}

function main() {
  const baseReference = resolveBaseReference();
  const diff = runGit([
    "diff",
    "--unified=0",
    "--no-color",
    baseReference,
    "--",
    "apps/game-client/src",
  ]);
  const changedLines = includeUntrackedProductionFiles(parseChangedLines(diff));
  const coverage = JSON.parse(readFileSync(COVERAGE_PATH, "utf8"));
  const counters = calculateChangedCoverage(coverage, changedLines);

  console.log(`Changed-code coverage against ${baseReference}:`);
  console.log("metric       covered/total   coverage");
  for (const metric of ["statements", "branches", "functions", "lines"]) {
    const result = percentage(counters[metric]);
    console.log(
      `${metric.padEnd(12)} ${String(counters[metric].covered).padStart(5)}/${String(counters[metric].total).padEnd(7)} ${result.toFixed(2).padStart(7)}%`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
