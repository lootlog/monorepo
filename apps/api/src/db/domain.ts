import postgres from "@prisma/orm-postgres/runtime";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import type {
  Contract,
  FieldInputTypes,
  FieldOutputTypes,
} from "./generated/contract.js";
import contractJson from "./generated/contract.json";

const contractMetadata = postgres<Contract>({ contractJson });

export type { JsonValue };
export type InputJsonValue = JsonValue;

// Prisma 8 no longer generates the Prisma 7 namespace. Keep the small set of
// application-level data shapes behind this service-local database adapter while callers
// are moved to the new runtime surface.
export namespace Prisma {
  export const DbNull = null;
  export const TransactionIsolationLevel = {
    Serializable: "Serializable",
  } as const;

  export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonObject
    | JsonValue[];
  export type InputJsonValue = JsonValue | InputJsonObject | InputJsonValue[];
  export type JsonObject = { [key: string]: JsonValue };
  export type InputJsonObject = {
    [key: string]: InputJsonValue | undefined;
  };
  export type BatchPayload = { count: number };
  export type PrismaPromise<T> = Promise<T>;
  export type TransactionClient =
    import("./application-client.js").ApiApplicationTransaction;
  export type TransactionIsolationLevel =
    (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];

  export type DateTimeFilter = Record<string, unknown>;
  export type IntNullableFilter = Record<string, unknown>;
  export type StringNullableFilter = Record<string, unknown>;
  export type EventMapAssignmentHistoryWhereInput = Record<string, unknown>;
  export type EventWhereInput = Record<string, unknown>;
  export type LootWhereInput = Record<string, unknown>;
  export type NotificationTargetUpdateInput = Record<string, unknown> & {
    displayName?: string | null;
  };
  export type NpcSnapshotWhereInput = Record<string, unknown>;
  export type PlayerSnapshotWhereUniqueInput = Record<string, unknown>;
  export type RoleUpdateInput = Record<string, unknown>;
  export type TimerWhereInput = Record<string, unknown>;
  export type LootItemSelect = Record<string, unknown>;
  export type LootPlayerCreateWithoutLootInput = Record<string, unknown>;

  export type LootGetPayload<_Selection> = Pick<
    Loot,
    | "createdAt"
    | "id"
    | "location"
    | "lootShare"
    | "source"
    | "uniqueId"
    | "updatedAt"
    | "world"
  >;
  export type LootItemGetPayload<_Selection> = LootItem & {
    itemSnapshot: ItemSnapshot;
  };
  export type LootNpcGetPayload<_Selection> = LootNpc & {
    npcSnapshot: NpcSnapshot;
  };
  export type LootPlayerGetPayload<_Selection> = LootPlayer & {
    playerSnapshot: PlayerSnapshot;
  };
  export type LootSubmissionGetPayload<_Selection> = LootSubmission & {
    member: Pick<Member, "avatar" | "name" | "userId">;
  };
}

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

type ApplicationDateValue<T> = null extends T ? Date | null : Date;

type ApplicationValue<T> = ApplicationObjectValue<T>;

type ApplicationObjectValue<T> = T extends readonly (infer Item)[]
  ? ApplicationValue<Item>[]
  : T extends object
    ? {
        -readonly [K in keyof T]: K extends ApplicationDateField
          ? ApplicationDateValue<T[K]>
          : ApplicationValue<T[K]>;
      }
    : T;

type PublicFields<T> = ApplicationValue<
  "_type" extends keyof T ? Omit<T, "_type"> & { type: T["_type"] } : T
>;

export const CoverageGapType =
  contractMetadata.nativeEnums.public.CoverageGapType.members;
export type CoverageGapType =
  (typeof CoverageGapType)[keyof typeof CoverageGapType];
export const DiscordGuildSyncStatus =
  contractMetadata.nativeEnums.public.DiscordGuildSyncStatus.members;
export type DiscordGuildSyncStatus =
  (typeof DiscordGuildSyncStatus)[keyof typeof DiscordGuildSyncStatus];
export const EventScoringMode =
  contractMetadata.nativeEnums.public.EventScoringMode.members;
export type EventScoringMode =
  (typeof EventScoringMode)[keyof typeof EventScoringMode];
export const GuildDocumentHistoryAction =
  contractMetadata.nativeEnums.public.GuildDocumentHistoryAction.members;
export type GuildDocumentHistoryAction =
  (typeof GuildDocumentHistoryAction)[keyof typeof GuildDocumentHistoryAction];
export const ItemRarity =
  contractMetadata.nativeEnums.public.ItemRarity.members;
export type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
export const ItemType = contractMetadata.nativeEnums.public.ItemType.members;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];
export const LootShareSource =
  contractMetadata.nativeEnums.public.LootShareSource.members;
export type LootShareSource =
  (typeof LootShareSource)[keyof typeof LootShareSource];
export const LootSource =
  contractMetadata.nativeEnums.public.LootSource.members;
export type LootSource = (typeof LootSource)[keyof typeof LootSource];
export const MemberType =
  contractMetadata.nativeEnums.public.MemberType.members;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];
export const NotificationJobKind =
  contractMetadata.nativeEnums.public.NotificationJobKind.members;
export type NotificationJobKind =
  (typeof NotificationJobKind)[keyof typeof NotificationJobKind];
export const NotificationJobStatus =
  contractMetadata.nativeEnums.public.NotificationJobStatus.members;
export type NotificationJobStatus =
  (typeof NotificationJobStatus)[keyof typeof NotificationJobStatus];
export const NotificationOwnerType =
  contractMetadata.nativeEnums.public.NotificationOwnerType.members;
export type NotificationOwnerType =
  (typeof NotificationOwnerType)[keyof typeof NotificationOwnerType];
export const NotificationProvider =
  contractMetadata.nativeEnums.public.NotificationProvider.members;
export type NotificationProvider =
  (typeof NotificationProvider)[keyof typeof NotificationProvider];
export const NotificationScheduleAnchor =
  contractMetadata.nativeEnums.public.NotificationScheduleAnchor.members;
export type NotificationScheduleAnchor =
  (typeof NotificationScheduleAnchor)[keyof typeof NotificationScheduleAnchor];
export const NotificationScheduleIntervalType =
  contractMetadata.nativeEnums.public.NotificationScheduleIntervalType.members;
export type NotificationScheduleIntervalType =
  (typeof NotificationScheduleIntervalType)[keyof typeof NotificationScheduleIntervalType];
export const NotificationScheduleStrategy =
  contractMetadata.nativeEnums.public.NotificationScheduleStrategy.members;
export type NotificationScheduleStrategy =
  (typeof NotificationScheduleStrategy)[keyof typeof NotificationScheduleStrategy];
export const NotificationTargetType =
  contractMetadata.nativeEnums.public.NotificationTargetType.members;
export type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];
export const NotificationTriggerType =
  contractMetadata.nativeEnums.public.NotificationTriggerType.members;
export type NotificationTriggerType =
  (typeof NotificationTriggerType)[keyof typeof NotificationTriggerType];
export const NpcType = contractMetadata.nativeEnums.public.NpcType.members;
export type NpcType = (typeof NpcType)[keyof typeof NpcType];
export const Permission =
  contractMetadata.nativeEnums.public.Permission.members;
export type Permission = (typeof Permission)[keyof typeof Permission];
export const PointsEditType =
  contractMetadata.nativeEnums.public.PointsEditType.members;
export type PointsEditType =
  (typeof PointsEditType)[keyof typeof PointsEditType];
export const Profession =
  contractMetadata.nativeEnums.public.Profession.members;
export type Profession = (typeof Profession)[keyof typeof Profession];
export const RefreshJobStatus =
  contractMetadata.nativeEnums.public.RefreshJobStatus.members;
export type RefreshJobStatus =
  (typeof RefreshJobStatus)[keyof typeof RefreshJobStatus];
export const SettingsScopeType =
  contractMetadata.nativeEnums.public.SettingsScopeType.members;
export type SettingsScopeType =
  (typeof SettingsScopeType)[keyof typeof SettingsScopeType];
export const TimerHistoryAction =
  contractMetadata.nativeEnums.public.TimerHistoryAction.members;
export type TimerHistoryAction =
  (typeof TimerHistoryAction)[keyof typeof TimerHistoryAction];

export type Guild = PublicFields<FieldOutputTypes["public"]["Guild"]>;
export type GuildInput = PublicFields<FieldInputTypes["public"]["Guild"]>;
export type DiscordGuildChannelSnapshot = PublicFields<
  FieldOutputTypes["public"]["DiscordGuildChannelSnapshot"]
>;
export type DiscordGuildChannelSnapshotInput = PublicFields<
  FieldInputTypes["public"]["DiscordGuildChannelSnapshot"]
>;
export type DiscordGuildSyncState = PublicFields<
  FieldOutputTypes["public"]["DiscordGuildSyncState"]
>;
export type DiscordGuildSyncStateInput = PublicFields<
  FieldInputTypes["public"]["DiscordGuildSyncState"]
>;
export type Event = PublicFields<FieldOutputTypes["public"]["Event"]>;
export type EventInput = PublicFields<FieldInputTypes["public"]["Event"]>;
export type EventHeroNpc = PublicFields<
  FieldOutputTypes["public"]["EventHeroNpc"]
>;
export type EventHeroNpcInput = PublicFields<
  FieldInputTypes["public"]["EventHeroNpc"]
>;
export type Member = PublicFields<FieldOutputTypes["public"]["Member"]>;
export type MemberInput = PublicFields<FieldInputTypes["public"]["Member"]>;
export type EventHeroKill = PublicFields<
  FieldOutputTypes["public"]["EventHeroKill"]
>;
export type EventHeroKillInput = PublicFields<
  FieldInputTypes["public"]["EventHeroKill"]
>;
export type EventKillPoint = PublicFields<
  FieldOutputTypes["public"]["EventKillPoint"]
>;
export type EventKillPointInput = PublicFields<
  FieldInputTypes["public"]["EventKillPoint"]
>;
export type EventMapLocation = PublicFields<
  FieldOutputTypes["public"]["EventMapLocation"]
>;
export type EventMapLocationInput = PublicFields<
  FieldInputTypes["public"]["EventMapLocation"]
>;
export type EventMap = PublicFields<FieldOutputTypes["public"]["EventMap"]>;
export type EventMapInput = PublicFields<FieldInputTypes["public"]["EventMap"]>;
export type EventMapAssignmentHistory = PublicFields<
  FieldOutputTypes["public"]["EventMapAssignmentHistory"]
>;
export type EventMapAssignmentHistoryInput = PublicFields<
  FieldInputTypes["public"]["EventMapAssignmentHistory"]
>;
export type EventMapCoverageGap = PublicFields<
  FieldOutputTypes["public"]["EventMapCoverageGap"]
>;
export type EventMapCoverageGapInput = PublicFields<
  FieldInputTypes["public"]["EventMapCoverageGap"]
>;
export type EventMapToMember = PublicFields<
  FieldOutputTypes["public"]["EventMapToMember"]
>;
export type EventMapToMemberInput = PublicFields<
  FieldInputTypes["public"]["EventMapToMember"]
>;
export type EventRanking = PublicFields<
  FieldOutputTypes["public"]["EventRanking"]
>;
export type EventRankingInput = PublicFields<
  FieldInputTypes["public"]["EventRanking"]
>;
export type EventPointsEditHistory = PublicFields<
  FieldOutputTypes["public"]["EventPointsEditHistory"]
>;
export type EventPointsEditHistoryInput = PublicFields<
  FieldInputTypes["public"]["EventPointsEditHistory"]
>;
export type EventPresenceLog = PublicFields<
  FieldOutputTypes["public"]["EventPresenceLog"]
>;
export type EventPresenceLogInput = PublicFields<
  FieldInputTypes["public"]["EventPresenceLog"]
>;
export type EventRespawnWindowSummary = PublicFields<
  FieldOutputTypes["public"]["EventRespawnWindowSummary"]
>;
export type EventRespawnWindowSummaryInput = PublicFields<
  FieldInputTypes["public"]["EventRespawnWindowSummary"]
>;
export type GuildDocument = PublicFields<
  FieldOutputTypes["public"]["GuildDocument"]
>;
export type GuildDocumentInput = PublicFields<
  FieldInputTypes["public"]["GuildDocument"]
>;
export type GuildDocumentHistory = PublicFields<
  FieldOutputTypes["public"]["GuildDocumentHistory"]
>;
export type GuildDocumentHistoryInput = PublicFields<
  FieldInputTypes["public"]["GuildDocumentHistory"]
>;
export type GuildKillSummary = PublicFields<
  FieldOutputTypes["public"]["GuildKillSummary"]
>;
export type GuildKillSummaryInput = PublicFields<
  FieldInputTypes["public"]["GuildKillSummary"]
>;
export type GuildKillSummaryBucket = PublicFields<
  FieldOutputTypes["public"]["GuildKillSummaryBucket"]
>;
export type GuildKillSummaryBucketInput = PublicFields<
  FieldInputTypes["public"]["GuildKillSummaryBucket"]
>;
export type ItemSnapshot = PublicFields<
  FieldOutputTypes["public"]["ItemSnapshot"]
>;
export type ItemSnapshotInput = PublicFields<
  FieldInputTypes["public"]["ItemSnapshot"]
>;
export type Loot = PublicFields<FieldOutputTypes["public"]["Loot"]>;
export type LootInput = PublicFields<FieldInputTypes["public"]["Loot"]>;
export type LootComment = PublicFields<
  FieldOutputTypes["public"]["LootComment"]
>;
export type LootCommentInput = PublicFields<
  FieldInputTypes["public"]["LootComment"]
>;
export type LootItem = PublicFields<FieldOutputTypes["public"]["LootItem"]>;
export type LootItemInput = PublicFields<FieldInputTypes["public"]["LootItem"]>;
export type NpcSnapshot = PublicFields<
  FieldOutputTypes["public"]["NpcSnapshot"]
>;
export type NpcSnapshotInput = PublicFields<
  FieldInputTypes["public"]["NpcSnapshot"]
>;
export type LootNpc = PublicFields<FieldOutputTypes["public"]["LootNpc"]>;
export type LootNpcInput = PublicFields<FieldInputTypes["public"]["LootNpc"]>;
export type PlayerSnapshot = PublicFields<
  FieldOutputTypes["public"]["PlayerSnapshot"]
>;
export type PlayerSnapshotInput = PublicFields<
  FieldInputTypes["public"]["PlayerSnapshot"]
>;
export type LootPlayer = PublicFields<FieldOutputTypes["public"]["LootPlayer"]>;
export type LootPlayerInput = PublicFields<
  FieldInputTypes["public"]["LootPlayer"]
>;
export type LootSubmission = PublicFields<
  FieldOutputTypes["public"]["LootSubmission"]
>;
export type LootSubmissionInput = PublicFields<
  FieldInputTypes["public"]["LootSubmission"]
>;
export type LootlogConfig = PublicFields<
  FieldOutputTypes["public"]["LootlogConfig"]
>;
export type LootlogConfigInput = PublicFields<
  FieldInputTypes["public"]["LootlogConfig"]
>;
export type LootlogConfigNpc = PublicFields<
  FieldOutputTypes["public"]["LootlogConfigNpc"]
>;
export type LootlogConfigNpcInput = PublicFields<
  FieldInputTypes["public"]["LootlogConfigNpc"]
>;
export type MapTemplate = PublicFields<
  FieldOutputTypes["public"]["MapTemplate"]
>;
export type MapTemplateInput = PublicFields<
  FieldInputTypes["public"]["MapTemplate"]
>;
export type MemberRefreshJob = PublicFields<
  FieldOutputTypes["public"]["MemberRefreshJob"]
>;
export type MemberRefreshJobInput = PublicFields<
  FieldInputTypes["public"]["MemberRefreshJob"]
>;
export type Role = PublicFields<FieldOutputTypes["public"]["Role"]>;
export type RoleInput = PublicFields<FieldInputTypes["public"]["Role"]>;
export type MemberToRole = PublicFields<
  FieldOutputTypes["public"]["MemberToRole"]
>;
export type MemberToRoleInput = PublicFields<
  FieldInputTypes["public"]["MemberToRole"]
>;
export type NotificationRule = PublicFields<
  FieldOutputTypes["public"]["NotificationRule"]
>;
export type NotificationRuleInput = PublicFields<
  FieldInputTypes["public"]["NotificationRule"]
>;
export type NotificationTarget = PublicFields<
  FieldOutputTypes["public"]["NotificationTarget"]
>;
export type NotificationTargetInput = PublicFields<
  FieldInputTypes["public"]["NotificationTarget"]
>;
export type NotificationJob = PublicFields<
  FieldOutputTypes["public"]["NotificationJob"]
>;
export type NotificationJobInput = PublicFields<
  FieldInputTypes["public"]["NotificationJob"]
>;
export type NotificationRuleTarget = PublicFields<
  FieldOutputTypes["public"]["NotificationRuleTarget"]
>;
export type NotificationRuleTargetInput = PublicFields<
  FieldInputTypes["public"]["NotificationRuleTarget"]
>;
export type NpcKillStats = PublicFields<
  FieldOutputTypes["public"]["NpcKillStats"]
>;
export type NpcKillStatsInput = PublicFields<
  FieldInputTypes["public"]["NpcKillStats"]
>;
export type NpcKillStatsBucket = PublicFields<
  FieldOutputTypes["public"]["NpcKillStatsBucket"]
>;
export type NpcKillStatsBucketInput = PublicFields<
  FieldInputTypes["public"]["NpcKillStatsBucket"]
>;
type ReservationStorage = PublicFields<
  FieldOutputTypes["public"]["Reservation"]
>;
type ReservationInputStorage = PublicFields<
  FieldInputTypes["public"]["Reservation"]
>;
export type Reservation = Omit<
  ReservationStorage,
  "reservationId" | "createdDate" | "fromDate" | "toDate" | "createdBy"
> & {
  legacyReservationId: ReservationStorage["reservationId"];
  legacyCreatedDate: ReservationStorage["createdDate"];
  legacyFromDate: ReservationStorage["fromDate"];
  legacyToDate: ReservationStorage["toDate"];
  legacyCreatedByDiscordId: ReservationStorage["createdBy"];
};
export type ReservationInput = Omit<
  ReservationInputStorage,
  "reservationId" | "createdDate" | "fromDate" | "toDate" | "createdBy"
> & {
  legacyReservationId: ReservationInputStorage["reservationId"];
  legacyCreatedDate: ReservationInputStorage["createdDate"];
  legacyFromDate: ReservationInputStorage["fromDate"];
  legacyToDate: ReservationInputStorage["toDate"];
  legacyCreatedByDiscordId: ReservationInputStorage["createdBy"];
};
export type ReservationShare = PublicFields<
  FieldOutputTypes["public"]["ReservationShare"]
>;
export type ReservationShareInput = PublicFields<
  FieldInputTypes["public"]["ReservationShare"]
>;
export type ReservationShareInvitation = PublicFields<
  FieldOutputTypes["public"]["ReservationShareInvitation"]
>;
export type ReservationShareInvitationInput = PublicFields<
  FieldInputTypes["public"]["ReservationShareInvitation"]
>;
export type Timer = PublicFields<FieldOutputTypes["public"]["Timer"]>;
export type TimerInput = PublicFields<FieldInputTypes["public"]["Timer"]>;
export type TimerHistoryEntry = PublicFields<
  FieldOutputTypes["public"]["TimerHistoryEntry"]
>;
export type TimerHistoryEntryInput = PublicFields<
  FieldInputTypes["public"]["TimerHistoryEntry"]
>;
export type UserCharactersLootlogSettings = PublicFields<
  FieldOutputTypes["public"]["UserCharactersLootlogSettings"]
>;
export type UserCharactersLootlogSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserCharactersLootlogSettings"]
>;
export type UserGameAccountSettings = PublicFields<
  FieldOutputTypes["public"]["UserGameAccountSettings"]
>;
export type UserGameAccountSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserGameAccountSettings"]
>;
export type UserGuildTimerSettings = PublicFields<
  FieldOutputTypes["public"]["UserGuildTimerSettings"]
>;
export type UserGuildTimerSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserGuildTimerSettings"]
>;
export type UserKillStats = PublicFields<
  FieldOutputTypes["public"]["UserKillStats"]
>;
export type UserKillStatsInput = PublicFields<
  FieldInputTypes["public"]["UserKillStats"]
>;
export type UserKillStatsBucket = PublicFields<
  FieldOutputTypes["public"]["UserKillStatsBucket"]
>;
export type UserKillStatsBucketInput = PublicFields<
  FieldInputTypes["public"]["UserKillStatsBucket"]
>;
export type UserPinnedEvent = PublicFields<
  FieldOutputTypes["public"]["UserPinnedEvent"]
>;
export type UserPinnedEventInput = PublicFields<
  FieldInputTypes["public"]["UserPinnedEvent"]
>;
export type UserPinnedReservationSpot = PublicFields<
  FieldOutputTypes["public"]["UserPinnedReservationSpot"]
>;
export type UserPinnedReservationSpotInput = PublicFields<
  FieldInputTypes["public"]["UserPinnedReservationSpot"]
>;
export type UserSettingDocument = PublicFields<
  FieldOutputTypes["public"]["UserSettingDocument"]
>;
export type UserSettingDocumentInput = PublicFields<
  FieldInputTypes["public"]["UserSettingDocument"]
>;
export type UserSettings = PublicFields<
  FieldOutputTypes["public"]["UserSettings"]
>;
export type UserSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserSettings"]
>;
export type UserSoundSettings = PublicFields<
  FieldOutputTypes["public"]["UserSoundSettings"]
>;
export type UserSoundSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserSoundSettings"]
>;
export type UserTimerSettings = PublicFields<
  FieldOutputTypes["public"]["UserTimerSettings"]
>;
export type UserTimerSettingsInput = PublicFields<
  FieldInputTypes["public"]["UserTimerSettings"]
>;
export type WatchedItem = PublicFields<
  FieldOutputTypes["public"]["WatchedItem"]
>;
export type WatchedItemInput = PublicFields<
  FieldInputTypes["public"]["WatchedItem"]
>;
