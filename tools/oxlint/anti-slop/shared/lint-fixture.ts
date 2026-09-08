import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

/** Run the actual linter against isolated source files and return its diagnostics. */
export function lintFixture(configText: string, sources: Record<string, string>) {
  const directory = mkdtempSync(join(tmpdir(), "anti-slop-regression-"));
  try {
    const config = join(directory, ".oxlintrc.json");
    writeFileSync(config, configText);
    for (const [filename, source] of Object.entries(sources)) {
      writeFileSync(join(directory, filename), source);
    }
    const result = spawnSync(resolve(import.meta.dir, "../../../../node_modules/.bin/oxlint"), [
      "--config", config, "--format", "json", ...Object.keys(sources),
    ], { cwd: directory, encoding: "utf8" });
    if (result.error) throw result.error;
    if (result.status !== 0 && result.status !== 1) {
      throw new Error(result.stderr || result.stdout);
    }
    const report: {
      diagnostics: Array<{ filename: string; message: string; code: string }>;
    } = JSON.parse(result.stdout);
    return { status: result.status, diagnostics: report.diagnostics };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
