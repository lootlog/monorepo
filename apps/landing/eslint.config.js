import { nextJsConfig } from "@lootlog/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: [".next/**", "out/**", "node_modules/**"],
  },
  ...nextJsConfig,
];
