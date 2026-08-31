import postgres from "@prisma/orm-postgres/runtime";
import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import type { Contract, FieldOutputTypes } from "../prisma/contract.js";
import contractJson from "../prisma/contract.json" with { type: "json" };
import type { db } from "../prisma/db.js";

const nativeEnums = postgres<Contract>({ contractJson }).nativeEnums.public;

export const CoverageGapType = nativeEnums.CoverageGapType.members;
export type CoverageGapType =
  (typeof CoverageGapType)[keyof typeof CoverageGapType];

export const DiscordGuildSyncStatus =
  nativeEnums.DiscordGuildSyncStatus.members;
export type DiscordGuildSyncStatus =
  (typeof DiscordGuildSyncStatus)[keyof typeof DiscordGuildSyncStatus];

export const EventScoringMode = nativeEnums.EventScoringMode.members;
export type EventScoringMode =
  (typeof EventScoringMode)[keyof typeof EventScoringMode];

export const GuildDocumentHistoryAction =
  nativeEnums.GuildDocumentHistoryAction.members;
export type GuildDocumentHistoryAction =
  (typeof GuildDocumentHistoryAction)[keyof typeof GuildDocumentHistoryAction];

export const ItemRarity = nativeEnums.ItemRarity.members;
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];

export const ItemType = nativeEnums.ItemType.members;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];

export const LootShareSource = nativeEnums.LootShareSource.members;
export type LootShareSource =
  (typeof LootShareSource)[keyof typeof LootShareSource];

export const LootSource = nativeEnums.LootSource.members;
export type LootSource = (typeof LootSource)[keyof typeof LootSource];

export const MemberType = nativeEnums.MemberType.members;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

export const NotificationJobKind = nativeEnums.NotificationJobKind.members;
export type NotificationJobKind =
  (typeof NotificationJobKind)[keyof typeof NotificationJobKind];

export const NotificationJobStatus = nativeEnums.NotificationJobStatus.members;
export type NotificationJobStatus =
  (typeof NotificationJobStatus)[keyof typeof NotificationJobStatus];

export const NotificationOwnerType = nativeEnums.NotificationOwnerType.members;
export type NotificationOwnerType =
  (typeof NotificationOwnerType)[keyof typeof NotificationOwnerType];

export const NotificationProvider = nativeEnums.NotificationProvider.members;
export type NotificationProvider =
  (typeof NotificationProvider)[keyof typeof NotificationProvider];

export const NotificationScheduleAnchor =
  nativeEnums.NotificationScheduleAnchor.members;
export type NotificationScheduleAnchor =
  (typeof NotificationScheduleAnchor)[keyof typeof NotificationScheduleAnchor];

export const NotificationScheduleIntervalType =
  nativeEnums.NotificationScheduleIntervalType.members;
export type NotificationScheduleIntervalType =
  (typeof NotificationScheduleIntervalType)[keyof typeof NotificationScheduleIntervalType];

export const NotificationScheduleStrategy =
  nativeEnums.NotificationScheduleStrategy.members;
export type NotificationScheduleStrategy =
  (typeof NotificationScheduleStrategy)[keyof typeof NotificationScheduleStrategy];

export const NotificationTargetType =
  nativeEnums.NotificationTargetType.members;
export type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];

export const NotificationTriggerType =
  nativeEnums.NotificationTriggerType.members;
export type NotificationTriggerType =
  (typeof NotificationTriggerType)[keyof typeof NotificationTriggerType];

export const NpcType = nativeEnums.NpcType.members;
export type NpcType = (typeof NpcType)[keyof typeof NpcType];

export const Permission = nativeEnums.Permission.members;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const PointsEditType = nativeEnums.PointsEditType.members;
export type PointsEditType =
  (typeof PointsEditType)[keyof typeof PointsEditType];

export const Profession = nativeEnums.Profession.members;
export type Profession = (typeof Profession)[keyof typeof Profession];

export const RefreshJobStatus = nativeEnums.RefreshJobStatus.members;
export type RefreshJobStatus =
  (typeof RefreshJobStatus)[keyof typeof RefreshJobStatus];

export const SettingsScopeType = nativeEnums.SettingsScopeType.members;
export type SettingsScopeType =
  (typeof SettingsScopeType)[keyof typeof SettingsScopeType];

export const TimerHistoryAction = nativeEnums.TimerHistoryAction.members;
export type TimerHistoryAction =
  (typeof TimerHistoryAction)[keyof typeof TimerHistoryAction];

export type JsonValue = DatabaseJsonValue;
export type JsonObject = Record<string, JsonValue | undefined>;
export type InputJsonValue = JsonValue;
export type InputJsonObject = JsonObject;

export type DatabaseTransaction = Parameters<
  Parameters<(typeof db)["transaction"]>[0]
>[0];

type ApplicationDateField =
  | `${string}At`
  | `${"created" | "from" | "to"}Date`
  | "maxSpawnTime"
  | "maxSpawnTimeAtKill"
  | "minSpawnTime"
  | "minSpawnTimeAtKill"
  | "periodStart";

type ApplicationValue<Value> = Value extends readonly (infer Item)[]
  ? ApplicationValue<Item>[]
  : Value extends object
    ? {
        -readonly [Key in keyof Value]: Key extends ApplicationDateField
          ? null extends Value[Key]
            ? Date | null
            : Date
          : ApplicationValue<Value[Key]>;
      }
    : Value;

type PublicModel<Model extends keyof FieldOutputTypes["public"]> =
  ApplicationValue<
    "_type" extends keyof FieldOutputTypes["public"][Model]
      ? Omit<FieldOutputTypes["public"][Model], "_type"> & {
          type: FieldOutputTypes["public"][Model]["_type"];
        }
      : FieldOutputTypes["public"][Model]
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
