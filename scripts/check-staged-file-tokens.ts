import { $ } from "bun";

const tokenLimit = 5000;

const bytesPerToken = 4;

const skippedAttributes = ["linguist-generated", "linguist-vendored"];

type OversizedFile = {
  readonly path: string;
  readonly bytes: number;
  readonly tokens: number;
};

const formatNumber = (value: number) => value.toLocaleString("en-US");

function nulFields(output: string): string[] {
  return output.split("\0").filter((field) => field.length > 0);
}

async function stagedTextFiles(): Promise<string[]> {
  const fields = nulFields(
    await $`git diff --cached --numstat --no-renames -z --diff-filter=ACMR`.text(),
  );

  return fields.flatMap((entry) => {
    const [added, , path] = entry.split("\t");

    return added === "-" || path === undefined ? [] : [path];
  });
}

async function skippedByAttributes(
  paths: readonly string[],
): Promise<Set<string>> {
  const input = new Response(paths.join("\0"));

  const fields = nulFields(
    await $`git check-attr -z --cached --stdin ${skippedAttributes} < ${input}`.text(),
  );

  const skipped = new Set<string>();

  for (let index = 0; index + 2 < fields.length; index += 3) {
    const value = fields[index + 2];

    if (value !== "unspecified" && value !== "unset" && value !== "false") {
      skipped.add(fields[index] ?? "");
    }
  }

  return skipped;
}

async function stagedSizes(paths: readonly string[]): Promise<number[]> {
  const input = new Response(paths.map((path) => `:${path}\n`).join(""));

  const output =
    await $`git cat-file --batch-check=${"%(objectsize)"} < ${input}`.text();

  return output.trimEnd().split("\n").map(Number);
}

async function findOversizedFiles(): Promise<OversizedFile[]> {
  const staged = await stagedTextFiles();

  if (staged.length === 0) return [];
  const skipped = await skippedByAttributes(staged);
  const checked = staged.filter((path) => !skipped.has(path));

  if (checked.length === 0) return [];
  const sizes = await stagedSizes(checked);

  return checked
    .map((path, index) => {
      const bytes = sizes[index] ?? 0;

      return { path, bytes, tokens: Math.ceil(bytes / bytesPerToken) };
    })
    .filter((file) => file.tokens > tokenLimit)
    .toSorted((left, right) => right.tokens - left.tokens);
}

function report(files: readonly OversizedFile[]): string {
  const rows = files.map(
    (file) =>
      `  ${file.path}\n    ${formatNumber(file.tokens)} tokens (${formatNumber(file.bytes)} bytes), ${formatNumber(file.tokens - tokenLimit)} over the limit`,
  );

  return `
✖ ${files.length === 1 ? "1 staged file exceeds" : `${files.length} staged files exceed`} the ${formatNumber(tokenLimit)}-token limit.
  Tokens are counted as bytes / ${bytesPerToken}, so the limit is ${formatNumber(tokenLimit * bytesPerToken)} bytes per file.

${rows.join("\n")}

Split every file above into smaller files before committing:

  1. Find the seams. List what the file exports and group the pieces by the
     single concept each one serves (a type and its constructors, one hook,
     one handler, one feature's tests). Each group becomes one new file.
  2. Create the new files next to the original and name each one after its
     concept, following the directory's naming convention
     (e.g. loot-query.ts -> loot-query.filters.ts, loot-query.pagination.ts).
     Keep one React component per file.
  3. Move the code, not a copy of it. Every symbol lives in exactly one file;
     delete it from the original.
  4. Update every import to point at the file that now owns the symbol.
     Do not leave the original file behind as a barrel that only re-exports
     the moved symbols; if nothing remains in it, delete it.
  5. Split by file type:
     - Tests: one file per behaviour under test
       (e.g. timer-mutation.visibility.test.ts, timer-mutation.retries.test.ts);
       move fixtures shared by several of them into a *.fixtures.ts file.
     - JSON or translation data: split by top-level key or namespace into
       separate files and load each one where it is used.
     - Markdown: keep an overview in the original and move each large
       section into its own linked page.
  6. Run lint, typecheck, tests and \`bun run knip\` for the affected
     workspaces, stage the new files and the edited importers, and commit again.

Do not bypass this check with --no-verify. If a file is generated or copied
from a third party rather than authored here, mark its path in .gitattributes
with linguist-generated=true or linguist-vendored=true instead.
`;
}

const oversized = await findOversizedFiles();

if (oversized.length > 0) {
  console.error(report(oversized));
  process.exit(1);
}
