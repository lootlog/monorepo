import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");

export type FoundComment = {
  readonly file: string;
  readonly line: number;
  readonly byteOffset: number;
  readonly byteLength: number;
};

type OxlintReport = {
  diagnostics: {
    code: string;
    filename: string;
    labels: [{ span: { offset: number; length: number; line: number } }];
  }[];
};

export async function findComments(
  paths: readonly string[],
): Promise<FoundComment[]> {
  const rootConfig = Bun.JSONC.parse(
    await Bun.file(join(repositoryRoot, ".oxlintrc.json")).text(),
  );

  const configPath = join(tmpdir(), `lootlog-comments-${process.pid}.json`);

  await Bun.write(
    configPath,
    JSON.stringify({
      categories: { correctness: "off" },
      jsPlugins: [
        {
          name: "lootlog-comments",
          specifier: join(import.meta.dir, "index.ts"),
        },
      ],
      rules: { "lootlog-comments/no-comments": "error" },
    }),
  );

  const ignoreFlags = rootConfig.ignorePatterns.flatMap((pattern: string) => [
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

    return report.diagnostics
      .filter(
        (diagnostic) => diagnostic.code === "lootlog-comments(no-comments)",
      )
      .map((diagnostic) => {
        const { span } = diagnostic.labels[0];

        return {
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
