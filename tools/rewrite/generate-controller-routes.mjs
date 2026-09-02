import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("../../node_modules/.bun/typescript@6.0.3/node_modules/typescript/lib/typescript.js");

const controllerFiles = process.argv.slice(2);
if (controllerFiles.length === 0) throw new Error("Pass controller files");

const callerKeys = new Map([
  ["DiscordId", "discordId"],
  ["GuildData", "guild"],
  ["GuildMember", "member"],
  ["MemberAccessPolicy", "accessPolicy"],
  ["MemberPermissions", "permissions"],
  ["MemberRoles", "roles"],
  ["UserId", "userId"],
]);

const decoratorCall = (decorator) => {
  const expression = decorator.expression;
  return ts.isCallExpression(expression) ? expression : undefined;
};

const decoratorName = (decorator) => {
  const call = decoratorCall(decorator);
  const expression = call?.expression ?? decorator.expression;
  return ts.isIdentifier(expression) ? expression.text : undefined;
};

const stringArgument = (call) => {
  const argument = call?.arguments[0];
  return argument && ts.isStringLiteral(argument) ? argument.text : undefined;
};

const operationId = (method, className, sourceFile) => {
  for (const decorator of ts.getDecorators(method) ?? []) {
    if (decoratorName(decorator) !== "ApiOperation") continue;
    const options = decoratorCall(decorator)?.arguments[0];
    if (!options || !ts.isObjectLiteralExpression(options)) continue;
    for (const property of options.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      if (property.name.getText(sourceFile) !== "operationId") continue;
      if (ts.isStringLiteral(property.initializer))
        return property.initializer.text;
    }
  }
  const methodName = method.name.getText(sourceFile);
  return `${className}${methodName[0]?.toUpperCase()}${methodName.slice(1)}`;
};

const argumentDescriptor = (parameter) => {
  for (const decorator of ts.getDecorators(parameter) ?? []) {
    const name = decoratorName(decorator);
    const call = decoratorCall(decorator);
    const callerKey = name && callerKeys.get(name);
    if (callerKey) return { source: "caller", key: callerKey };
    if (name === "Body") return { source: "payload" };
    if (name === "Param")
      return { source: "params", key: stringArgument(call) };
    if (name === "Query") return { source: "query", key: stringArgument(call) };
  }
  throw new Error(
    `Unsupported undecorated route parameter ${parameter.name.getText()}`,
  );
};

const routes = {};
for (const file of controllerFiles) {
  const source = await readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue;
    const className = statement.name.text;
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !member.name) continue;
      const endpoint = operationId(member, className, sourceFile);
      routes[endpoint] = {
        controller: className,
        method: member.name.getText(sourceFile),
        arguments: member.parameters.map(argumentDescriptor),
      };
    }
  }
}

const output = `/** Generated from the retired Nest controller signatures. */\nexport const controllerRoutes = ${JSON.stringify(routes, null, 2)} as const;\n`;
await writeFile(
  "apps/api/src/http-api/runtime/controller-routes.generated.ts",
  output,
);
