import { parse } from "@babel/parser";

const sourceRoots = [
  "apps/activity/src",
  "apps/api/src",
  "apps/auth/src",
  "apps/battlelog/src",
  "apps/discord-bot/src",
  "apps/gateway/src",
  "apps/search/src",
  "packages/messaging/src",
  "packages/protocol/src",
] as const;

const runtimeBoundaryAllowlist = new Set([
  "apps/api/src/database/drizzle/migrate.ts",
  "apps/api/src/discord/discord-rest-client.factory.ts",
  "apps/api/src/events/event-hero-kill.processor.ts",
  "apps/api/src/events/event-presence-tracking.ts",
  "apps/api/src/http-api/runtime/native-background-layers.ts",
  "apps/battlelog/src/app.factory.ts",
  "apps/gateway/src/app.ts",
]);

const forkBoundaryAllowlist = new Set([
  "apps/api/src/shared/diagnostics/node-warning-diagnostics.ts",
  "apps/api/src/shared/logging/application-logger.ts",
  "apps/auth/src/auth/auth-redis-storage.ts",
  "apps/battlelog/src/platform/logger.ts",
  "apps/discord-bot/src/bot/bot-discord-events.handler.ts",
  "apps/discord-bot/src/shared/logger.ts",
  "apps/gateway/src/platform/background-tasks.ts",
  "apps/gateway/src/platform/logger.ts",
  "apps/search/src/shared/logger.ts",
]);

type Rule = {
  readonly name: string;
  readonly pattern: RegExp;
  readonly allow?: (path: string) => boolean;
};

type SyntaxNode = {
  readonly end?: number | null;
  readonly loc?: { readonly start: { readonly line: number } } | null;
  readonly start?: number | null;
  readonly type: string;
  readonly [key: string]: unknown;
};

const isSyntaxNode = (value: unknown): value is SyntaxNode =>
  typeof value === "object" &&
  value !== null &&
  "type" in value &&
  typeof value.type === "string";

const isFunctionNode = (node: SyntaxNode) =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression" ||
  node.type === "ObjectMethod" ||
  node.type === "ClassMethod";

const nodeSource = (node: SyntaxNode, source: string) =>
  node.start === undefined ||
  node.start === null ||
  node.end === undefined ||
  node.end === null
    ? ""
    : source.slice(node.start, node.end);

const findFunctionOwner = (
  ancestors: ReadonlyArray<SyntaxNode>,
  source: string,
) => {
  const ownerIndex = ancestors.findLastIndex(isFunctionNode);
  const ownerParent = ancestors[ownerIndex - 1];
  const ownerCallee =
    ownerParent?.type === "CallExpression" && isSyntaxNode(ownerParent.callee)
      ? nodeSource(ownerParent.callee, source)
      : "";
  return {
    isEffectGenerator:
      ownerCallee === "Effect.gen" || ownerCallee.startsWith("Effect.fn"),
    ownerIndex,
  };
};

const isDirectSystemClock = (node: SyntaxNode) => {
  const isCurrentDate =
    node.type === "NewExpression" &&
    isSyntaxNode(node.callee) &&
    node.callee.type === "Identifier" &&
    node.callee.name === "Date" &&
    Array.isArray(node.arguments) &&
    node.arguments.length === 0;
  const isCurrentTimeMillis =
    node.type === "CallExpression" &&
    isSyntaxNode(node.callee) &&
    node.callee.type === "MemberExpression" &&
    isSyntaxNode(node.callee.object) &&
    node.callee.object.type === "Identifier" &&
    node.callee.object.name === "Date" &&
    isSyntaxNode(node.callee.property) &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "now";
  return isCurrentDate || isCurrentTimeMillis;
};

const isThrowCaughtLocally = (
  node: SyntaxNode,
  ancestors: ReadonlyArray<SyntaxNode>,
  ownerIndex: number,
) =>
  ancestors.slice(ownerIndex + 1).some((ancestor) => {
    if (ancestor.type !== "TryStatement" || ancestor.handler === null) {
      return false;
    }
    const block = ancestor.block;
    return (
      isSyntaxNode(block) &&
      block.start !== undefined &&
      block.start !== null &&
      block.end !== undefined &&
      block.end !== null &&
      node.start !== undefined &&
      node.start !== null &&
      node.start >= block.start &&
      node.start <= block.end
    );
  });

const findEffectGeneratorFindings = (
  path: string,
  source: string,
): string[] => {
  const findings: string[] = [];
  const program = parse(source, {
    plugins: ["typescript", "decorators-legacy", "importAttributes"],
    sourceType: "module",
  });

  const visit = (node: SyntaxNode, ancestors: ReadonlyArray<SyntaxNode>) => {
    const { isEffectGenerator, ownerIndex } = findFunctionOwner(
      ancestors,
      source,
    );
    if (isEffectGenerator && isDirectSystemClock(node)) {
      findings.push(
        `${path}:${node.loc?.start.line ?? 1}: direct system clock inside Effect generator`,
      );
    }

    if (node.type === "ThrowStatement") {
      const caughtLocally = isThrowCaughtLocally(node, ancestors, ownerIndex);
      if (!caughtLocally && ownerIndex >= 0 && isEffectGenerator) {
        findings.push(
          `${path}:${node.loc?.start.line ?? 1}: throw inside Effect generator`,
        );
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "comments" || key === "errors" || key === "loc") continue;
      if (Array.isArray(value)) {
        for (const child of value) {
          if (isSyntaxNode(child)) visit(child, [...ancestors, node]);
        }
      } else if (isSyntaxNode(value)) {
        visit(value, [...ancestors, node]);
      }
    }
  };

  visit(program, []);
  return findings;
};

const rules: ReadonlyArray<Rule> = [
  { name: "Nest import", pattern: /(?:from|import\s*)\s*["']@nestjs\// },
  { name: "Nest-style exception", pattern: /\b[A-Z][A-Za-z]+Exception\b/ },
  { name: "ManagedRuntime in production", pattern: /\bManagedRuntime\b/ },
  { name: "global apiConfig", pattern: /\bconst\s+apiConfig\b/ },
  {
    name: "synchronous Effect runtime",
    pattern: /\bEffect\.runSync\b/,
    allow: (path) => path === "apps/auth/src/auth/better-auth-cli.ts",
  },
  {
    name: "untyped Promise rejection",
    pattern: /\bEffect\.promise\b/,
  },
  {
    name: "console logging",
    pattern: /\bconsole\.(?:debug|error|info|log|warn)\b/,
  },
  {
    name: "unchecked JSON type assertion",
    pattern: /JSON\.parse\([^\n]*\)\s+as\s+/,
  },
  {
    name: "unchecked decoded JSON assertion",
    pattern: /decodeJsonUnknown\([^\n]*\)\s+as\s+/,
  },
  {
    name: "generic SuperJSON assertion",
    pattern: /superjson\.parse\s*</,
  },
  {
    name: "nested Effect Promise runtime",
    pattern: /\bEffect\.runPromise\b/,
    allow: (path) => runtimeBoundaryAllowlist.has(path),
  },
  {
    name: "unscoped fork runtime",
    pattern: /\bEffect\.runFork\b/,
    allow: (path) => forkBoundaryAllowlist.has(path),
  },
];

const findings: string[] = [];
for (const root of sourceRoots) {
  const glob = new Bun.Glob(`${root}/**/*.ts`);
  for await (const path of glob.scan({ cwd: ".", absolute: false })) {
    if (path.endsWith(".test.ts") || path.endsWith(".spec.ts")) continue;
    const source = await Bun.file(path).text();
    findings.push(...findEffectGeneratorFindings(path, source));
    const lines = source.split("\n");
    const uncheckedJsonAssertion =
      /JSON\.parse\([\s\S]{0,500}?\)\s+as\s+/m.exec(source);
    if (uncheckedJsonAssertion) {
      const line = source
        .slice(0, uncheckedJsonAssertion.index)
        .split("\n").length;
      findings.push(`${path}:${line}: unchecked JSON type assertion`);
    }
    for (const rule of rules) {
      if (rule.name === "unchecked JSON type assertion") continue;
      if (rule.allow?.(path)) continue;
      for (const [index, line] of lines.entries()) {
        if (rule.pattern.test(line)) {
          findings.push(`${path}:${index + 1}: ${rule.name}`);
        }
      }
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Effect architecture checks passed.\n");
