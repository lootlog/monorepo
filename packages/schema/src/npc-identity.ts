import { Schema } from "effect";

/**
 * Meaning of a stored Margonem NPC number.
 *
 * - `template`: Margonem `npc.tpl`, shared by every spawn of one monster
 *   template. It is the catalog identity for search and notification rules.
 * - `runtime`: Margonem `npc.id`, one spawn point on a map. `npcs_del` and
 *   battle `originalId` use it; timers are keyed by it. A runtime observation
 *   was accepted without a known template.
 * - `legacy`: written by clients that sent one overloaded `id`, which may be
 *   either of the above. Equal numbers across namespaces are unrelated.
 */
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
