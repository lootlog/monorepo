import {
  OrganizationLimits,
  SuspensionReason,
} from "@lootlog/schema/admin-organizations";
import { Schema } from "effect";

export const OrganizationAction = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("limits"),
    limits: OrganizationLimits,
  }),
  Schema.Struct({ action: Schema.Literal("clear-vanity-url") }),
  Schema.Struct({ action: Schema.Literal("refresh-discord-sync") }),
  Schema.Struct({
    action: Schema.Literal("suspend"),
    reason: SuspensionReason,
  }),
  Schema.Struct({ action: Schema.Literal("resume") }),
]);

export type OrganizationAction = typeof OrganizationAction.Type;

export const OrganizationActionRequest = Schema.Struct({
  guildId: Schema.NonEmptyString,
  action: OrganizationAction,
});
