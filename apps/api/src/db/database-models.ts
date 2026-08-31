import type { FieldOutputTypes } from "../prisma/contract.js";

type ApplicationDateField =
  | "acceptedAt"
  | "assignedAt"
  | "completedAt"
  | "confirmationDeadlineAt"
  | "confirmationExpiredAcknowledgedAt"
  | "confirmedAt"
  | "createdAt"
  | "createdDate"
  | "deletedAt"
  | "editedAt"
  | "endedAt"
  | "endsAt"
  | "expiresAt"
  | "fromDate"
  | "killedAt"
  | "lastAttemptAt"
  | "lastDeliveryAt"
  | "lastDiscordAttemptAt"
  | "lastDiscordSyncAt"
  | "lastKilledAt"
  | "lastSuccessAt"
  | "lastSyncedAt"
  | "maxSpawnTime"
  | "maxSpawnTimeAtKill"
  | "minSpawnTime"
  | "minSpawnTimeAtKill"
  | "periodStart"
  | "pinnedAt"
  | "processedAt"
  | "revokedAt"
  | "scheduledAt"
  | "scheduledFor"
  | "scheduledUntil"
  | "startedAt"
  | "startsAt"
  | "toDate"
  | "unassignedAt"
  | "updatedAt"
  | "windowClosedAt"
  | "windowOpenedAt";

type ApplicationDateValue<Value> = null extends Value ? Date | null : Date;

type ApplicationValue<Value> = Value extends readonly (infer Item)[]
  ? ApplicationValue<Item>[]
  : Value extends object
    ? {
        -readonly [Key in keyof Value]: Key extends ApplicationDateField
          ? ApplicationDateValue<Value[Key]>
          : ApplicationValue<Value[Key]>;
      }
    : Value;

type PublicFields<Value> = ApplicationValue<
  "_type" extends keyof Value
    ? Omit<Value, "_type"> & { type: Value["_type"] }
    : Value
>;

type PublicModel<Model extends keyof FieldOutputTypes["public"]> = PublicFields<
  FieldOutputTypes["public"][Model]
>;

export type Guild = PublicModel<"Guild">;
export type Role = PublicModel<"Role">;
export type Member = PublicModel<"Member">;
export type Timer = PublicModel<"Timer">;
export type PlayerSnapshot = PublicModel<"PlayerSnapshot">;
export type Reservation = PublicModel<"Reservation">;
export type LootlogConfigNpc = PublicModel<"LootlogConfigNpc">;
export type MemberRefreshJob = PublicModel<"MemberRefreshJob">;
export type Event = PublicModel<"Event">;
export type EventHeroNpc = PublicModel<"EventHeroNpc">;
export type EventKillPoint = PublicModel<"EventKillPoint">;
