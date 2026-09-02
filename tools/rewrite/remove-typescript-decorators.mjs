import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const ts = require("../../node_modules/.bun/typescript@6.0.3/node_modules/typescript/lib/typescript.js");

const DECORATOR_IMPORTS = new Set([
  "ApiBearerAuth",
  "ApiOperation",
  "ApiParam",
  "ApiQuery",
  "ApiResponse",
  "ApiTags",
  "Body",
  "Controller",
  "Delete",
  "DiscordId",
  "Get",
  "GuildData",
  "GuildMember",
  "HttpCode",
  "Inject",
  "Injectable",
  "InjectQueue",
  "MemberAccessPolicy",
  "MemberPermissions",
  "MemberRoles",
  "OnWorkerEvent",
  "Optional",
  "Param",
  "Patch",
  "Post",
  "Processor",
  "Put",
  "Query",
  "RabbitSubscribe",
  "RequiresCapabilities",
  "UseGuards",
  "UserId",
  "ZodResponse",
]);

const removeDecorators = (source, fileName) => {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const ranges = [];

  const visit = (node) => {
    if (ts.isDecorator(node)) {
      ranges.push([node.getStart(sourceFile), node.getEnd()]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return ranges
    .sort(([left], [right]) => right - left)
    .reduce(
      (output, [start, end]) => `${output.slice(0, start)}${output.slice(end)}`,
      source,
    );
};

const removeDecoratorImports = (source, fileName) => {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const replacements = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    const kept = bindings.elements.filter(
      (element) => !DECORATOR_IMPORTS.has(element.name.text),
    );
    if (kept.length === bindings.elements.length) continue;

    if (kept.length === 0 && clause.name === undefined) {
      replacements.push([
        statement.getStart(sourceFile),
        statement.getEnd(),
        "",
      ]);
      continue;
    }

    const replacement = `{ ${kept.map((element) => element.getText(sourceFile)).join(", ")} }`;
    replacements.push([
      bindings.getStart(sourceFile),
      bindings.getEnd(),
      replacement,
    ]);
  }

  return replacements
    .sort(([left], [right]) => right - left)
    .reduce(
      (output, [start, end, replacement]) =>
        `${output.slice(0, start)}${replacement}${output.slice(end)}`,
      source,
    );
};

const files = process.argv.slice(2);
if (files.length === 0) {
  throw new Error("Pass TypeScript files to rewrite");
}

for (const file of files) {
  const source = await readFile(file, "utf8");
  const rewritten = removeDecoratorImports(
    removeDecorators(source, file),
    file,
  );
  if (rewritten !== source) {
    await writeFile(file, rewritten);
  }
}
