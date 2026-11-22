import { Schema } from "effect";

export const NpcIdentityNamespace = {
  LEGACY: "legacy",
  RUNTIME: "runtime",
  TEMPLATE: "template",
} as const;

export type NpcIdentityNamespace =
  (typeof NpcIdentityNamespace)[keyof typeof NpcIdentityNamespace];

export const NpcIdentityNamespaceSchema = Schema.Literals([
  NpcIdentityNamespace.LEGACY,
  NpcIdentityNamespace.RUNTIME,
  NpcIdentityNamespace.TEMPLATE,
]);

export const normalizeNpcName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, " ");
