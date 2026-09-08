import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { lintFixture } from "../shared/lint-fixture";

test("raw I/O exceptions cover only named functions in reviewed files", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-unknown-parameters": "error" },
    overrides: [{
      files: ["wire.ts"],
      rules: { "anti-slop/no-unknown-parameters": ["error", { boundaryFunctions: ["serialize"] }] },
    }],
  }), {
    "wire.ts": [
      "export const serialize = (value: unknown) => JSON.stringify(value);",
      "function domain(value: unknown) { return value; }",
    ].join("\n"),
    "domain.ts": "export const serialize = (value: unknown) => JSON.stringify(value);",
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ["domain.ts", "anti-slop(no-unknown-parameters)"],
    ["wire.ts", "anti-slop(no-unknown-parameters)"],
  ]);
});

test("a raw parser typeof exception does not leak into nested callbacks or other files", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-runtime-typeof": "error" },
    overrides: [{
      files: ["wire.ts"],
      rules: { "anti-slop/no-runtime-typeof": ["error", { boundaryFunctions: ["parseHp"] }] },
    }],
  }), {
    "wire.ts": [
      "function parseHp(value: unknown) {",
      '  if (typeof value === "number") return value;',
      '  return [value].map((entry) => typeof entry);',
      "}",
    ].join("\n"),
    "domain.ts": 'function parseHp(value: unknown) { return typeof value; }',
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ["domain.ts", "anti-slop(no-runtime-typeof)"],
    ["wire.ts", "anti-slop(no-runtime-typeof)"],
  ]);
});

test("reviewed transport methods can return raw data without exempting other methods", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: {
      "anti-slop/no-unknown-parameters": ["error", { boundaryFunctions: ["receive"] }],
      "anti-slop/no-unknown-returns": ["error", { boundaryFunctions: ["receive"] }],
    },
  }), {
    "transport.ts": [
      "const adapter = { async receive(raw: unknown): Promise<unknown> { return raw; } };",
      "const domain = { async process(raw: unknown): Promise<unknown> { return raw; } };",
      "interface Transport { receive(raw: unknown): unknown; process(raw: unknown): unknown }",
    ].join("\n"),
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => d.code).sort()).toEqual([
    "anti-slop(no-unknown-parameters)",
    "anti-slop(no-unknown-parameters)",
    "anti-slop(no-unknown-returns)",
    "anti-slop(no-unknown-returns)",
  ]);
});


test("reviewed foreign function aliases do not exempt nested or domain signatures", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: {
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
    },
    overrides: [{ files: ["bridge.ts"], rules: {
      "anti-slop/no-unknown-parameters": ["error", { boundaryFunctions: ["RuntimeFunction", "Nested"] }],
      "anti-slop/no-unknown-returns": ["error", { boundaryFunctions: ["RuntimeFunction", "Nested"] }],
    } }],
  }), {
    "bridge.ts": [
      "type RuntimeFunction = (this: unknown, ...args: unknown[]) => unknown;",
      "type Nested = { callback: (value: unknown) => unknown };",
    ].join("\n"),
    "domain.ts": "type RuntimeFunction = (value: unknown) => unknown;",
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ["bridge.ts", "anti-slop(no-unknown-parameters)"],
    ["bridge.ts", "anti-slop(no-unknown-returns)"],
    ["domain.ts", "anti-slop(no-unknown-parameters)"],
    ["domain.ts", "anti-slop(no-unknown-returns)"],
  ]);
});

test("reviewed callback properties exclude nested signatures and other files", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: {
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
    },
    overrides: [{ files: ["logger.ts"], rules: {
      "anti-slop/no-unknown-parameters": ["error", { boundaryFunctions: ["details"] }],
      "anti-slop/no-unknown-returns": ["error", { boundaryFunctions: ["details"] }],
    } }],
  }), {
    "logger.ts": [
      "interface Logger { details?: (value: unknown) => unknown }",
      "type Nested = { details: () => (value: unknown) => unknown };",
      "type Domain = { process: (value: unknown) => unknown };",
    ].join("\n"),
    "domain.ts": "type Logger = { details: (value: unknown) => unknown };",
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ["domain.ts", "anti-slop(no-unknown-parameters)"],
    ["domain.ts", "anti-slop(no-unknown-returns)"],
    ["logger.ts", "anti-slop(no-unknown-parameters)"],
    ["logger.ts", "anti-slop(no-unknown-parameters)"],
    ["logger.ts", "anti-slop(no-unknown-returns)"],
    ["logger.ts", "anti-slop(no-unknown-returns)"],
  ]);
});

test("foreign Reflect.apply allowance stays inside its exact wrapper and file", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-reflect-apply": "error" },
    overrides: [{ files: ["bridge.ts"], rules: {
      "anti-slop/no-reflect-apply": ["error", { boundaryFunctions: ["wrapForeign"] }],
    } }],
  }), {
    "bridge.ts": [
      "const wrapForeign = function (...args) {",
      "  Reflect.apply(original, this, args);",
      "  return args.map(value => Reflect.apply(original, this, [value]));",
      "};",
      "function domain() { Reflect.apply(original, null, []); }",
    ].join("\n"),
    "domain.ts": "function wrapForeign() { Reflect.apply(original, null, []); }",
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ["bridge.ts", "anti-slop(no-reflect-apply)"],
    ["bridge.ts", "anti-slop(no-reflect-apply)"],
    ["domain.ts", "anti-slop(no-reflect-apply)"],
  ]);
});

test("raw callback cache sentinel allowance resolves only the reviewed module binding", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-known-value-widening": "error" },
    overrides: [{ files: ["bridge.ts"], rules: {
      "anti-slop/no-known-value-widening": ["error", { boundaryBindings: ["cachedEvent", "pendingEvent"] }],
    } }],
  }), {
    "bridge.ts": [
      "let cachedEvent: unknown = null;",
      "let pendingEvent: unknown = undefined;",
      "function reset() { cachedEvent = null; pendingEvent = undefined; }",
      "function domain() { let cachedEvent: unknown = null; cachedEvent = null; }",
      "let other: unknown = null;",
      "cachedEvent = 42;",
    ].join("\n"),
    "domain.ts": "let cachedEvent: unknown = null; cachedEvent = null;",
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => [d.filename, d.code]).sort()).toEqual([
    ...Array.from({ length: 4 }, () => ["bridge.ts", "anti-slop(no-known-value-widening)"]),
    ...Array.from({ length: 2 }, () => ["domain.ts", "anti-slop(no-known-value-widening)"]),
  ]);
});
