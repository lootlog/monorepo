import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");

export type FoundDiagnostic = {
  readonly rule: string;
  readonly file: string;
  readonly line: number;
  readonly byteOffset: number;
  readonly byteLength: number;
};

type OxlintConfig = {
  readonly ignorePatterns: readonly string[];
  readonly jsPlugins: readonly {
    readonly name: string;
    readonly specifier: string;
  }[];
};

type OxlintReport = {
  diagnostics: {
    code: string;
    filename: string;
    labels: [{ span: { offset: number; length: number; line: number } }];
  }[];
};

const ruleOfCode = (code: string) => code.replace(/^(.+)\((.+)\)$/u, "$1/$2");

export async function findDiagnostics(
  rules: readonly string[],
  paths: readonly string[],
): Promise<FoundDiagnostic[]> {
  const rootConfig: OxlintConfig = Bun.JSONC.parse(
    await Bun.file(join(repositoryRoot, ".oxlintrc.json")).text(),
  );

  const configPath = join(
    tmpdir(),
    `lootlog-diagnostics-${process.pid}-${crypto.randomUUID()}.json`,
  );

  await Bun.write(
    configPath,
    JSON.stringify({
      categories: { correctness: "off" },
      jsPlugins: rootConfig.jsPlugins.map((plugin) => ({
        name: plugin.name,
        specifier: resolve(repositoryRoot, plugin.specifier),
      })),
      rules: Object.fromEntries(rules.map((rule) => [rule, "error"])),
    }),
  );

  const ignoreFlags = rootConfig.ignorePatterns.flatMap((pattern) => [
    "--ignore-pattern",
    pattern,
  ]);

  try {
    const output =
      await Bun.$`bunx oxlint -c ${configPath} --disable-nested-config --format json ${ignoreFlags} ${paths}`
        .cwd(repositoryRoot)
        .nothrow()
        .quiet()
        .text();

    const report: OxlintReport = JSON.parse(output);
    const wanted = new Set(rules);

    return report.diagnostics
      .filter((diagnostic) => wanted.has(ruleOfCode(diagnostic.code)))
      .map((diagnostic) => {
        const { span } = diagnostic.labels[0];

        return {
          rule: ruleOfCode(diagnostic.code),
          file: diagnostic.filename,
          line: span.line,
          byteOffset: span.offset,
          byteLength: span.length,
        };
      });
  } finally {
    await Bun.file(configPath).delete();
  }
}
