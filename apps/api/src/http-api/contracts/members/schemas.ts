/** Transport schemas owned by the members HTTP module. */
import * as Schema from "effect/Schema";

export type NullableMemberResponseDto =
  | ({
      readonly id: number;
      readonly userId: string;
      readonly guildId: string;
      readonly type: "OWNER" | "ADMIN" | "USER" | "BOT";
      readonly name: string;
      readonly avatar?: string | null;
      readonly banner?: string | null;
      readonly active: boolean;
      readonly roles: ReadonlyArray<{
        readonly id: string;
        readonly guildId: string;
        readonly name: string;
        readonly color: number | null;
        readonly position?: number | null;
        readonly permissions: ReadonlyArray<
          | "OWNER"
          | "ADMIN"
          | "LOOTLOG_MANAGE"
          | "LOOTLOG_ACCESS"
          | "LOOTLOG_LOOTS_READ"
          | "LOOTLOG_LOOTS_WRITE"
          | "LOOTLOG_LOOTS_ARCHIVE"
          | "LOOTLOG_LOOTS_TITANS_READ"
          | "LOOTLOG_LOOTS_HEROES_READ"
          | "LOOTLOG_TIMERS_READ"
          | "LOOTLOG_TIMERS_WRITE"
          | "LOOTLOG_TIMERS_RESET"
          | "LOOTLOG_TIMERS_DELETE"
          | "LOOTLOG_TIMERS_TITANS_READ"
          | "LOOTLOG_TIMERS_HEROES_READ"
          | "LOOTLOG_RESERVATIONS_READ"
          | "LOOTLOG_RESERVATIONS_WRITE"
          | "LOOTLOG_MEMBERS_READ"
          | "LOOTLOG_ONLINE_PLAYERS_READ"
          | "LOOTLOG_PRESENCE_LOCATION_READ"
          | "LOOTLOG_CHAT_READ"
          | "LOOTLOG_CHAT_WRITE"
          | "LOOTLOG_CHAT_TITANS_READ"
          | "LOOTLOG_CHAT_HEROES_READ"
          | "LOOTLOG_NOTIFICATIONS_READ"
          | "LOOTLOG_NOTIFICATIONS_SEND"
          | "LOOTLOG_NOTIFICATIONS_TITANS_READ"
          | "LOOTLOG_NOTIFICATIONS_HEROES_READ"
          | "LOOTLOG_EVENTS_MANAGE"
          | "LOOTLOG_EVENTS_READ"
          | "LOOTLOG_EVENTS_WRITE"
          | "LOOTLOG_DOCS_READ"
          | "LOOTLOG_DOCS_WRITE"
        >;
        readonly lvlRangeFrom?: number | null;
        readonly lvlRangeTo?: number | null;
      }>;
      readonly globalUserId?: string | null;
      readonly lastDiscordSyncAt?: string | null;
      readonly lastDiscordAttemptAt?: string | null;
      readonly lastDiscordStatus?: string | null;
      readonly isStale?: boolean;
      readonly staleWarning?: string;
      readonly refreshQueued?: boolean;
      readonly nextRefreshAt?: string | null;
      readonly updatedAt: string;
    } & { readonly [x: string]: Schema.Json })
  | null;

export const NullableMemberResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      userId: Schema.String,
      guildId: Schema.String,
      type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
      name: Schema.String,
      avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
      active: Schema.Boolean,
      roles: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          guildId: Schema.String,
          name: Schema.String,
          color: Schema.Union([
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            Schema.Null,
          ]),
          position: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
          permissions: Schema.Array(
            Schema.Literals([
              "OWNER",
              "ADMIN",
              "LOOTLOG_MANAGE",
              "LOOTLOG_ACCESS",
              "LOOTLOG_LOOTS_READ",
              "LOOTLOG_LOOTS_WRITE",
              "LOOTLOG_LOOTS_ARCHIVE",
              "LOOTLOG_LOOTS_TITANS_READ",
              "LOOTLOG_LOOTS_HEROES_READ",
              "LOOTLOG_TIMERS_READ",
              "LOOTLOG_TIMERS_WRITE",
              "LOOTLOG_TIMERS_RESET",
              "LOOTLOG_TIMERS_DELETE",
              "LOOTLOG_TIMERS_TITANS_READ",
              "LOOTLOG_TIMERS_HEROES_READ",
              "LOOTLOG_RESERVATIONS_READ",
              "LOOTLOG_RESERVATIONS_WRITE",
              "LOOTLOG_MEMBERS_READ",
              "LOOTLOG_ONLINE_PLAYERS_READ",
              "LOOTLOG_PRESENCE_LOCATION_READ",
              "LOOTLOG_CHAT_READ",
              "LOOTLOG_CHAT_WRITE",
              "LOOTLOG_CHAT_TITANS_READ",
              "LOOTLOG_CHAT_HEROES_READ",
              "LOOTLOG_NOTIFICATIONS_READ",
              "LOOTLOG_NOTIFICATIONS_SEND",
              "LOOTLOG_NOTIFICATIONS_TITANS_READ",
              "LOOTLOG_NOTIFICATIONS_HEROES_READ",
              "LOOTLOG_EVENTS_MANAGE",
              "LOOTLOG_EVENTS_READ",
              "LOOTLOG_EVENTS_WRITE",
              "LOOTLOG_DOCS_READ",
              "LOOTLOG_DOCS_WRITE",
            ]),
          ),
          lvlRangeFrom: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
          lvlRangeTo: Schema.optionalKey(
            Schema.Union([
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              Schema.Null,
            ]),
          ),
        }),
      ),
      globalUserId: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Null]),
      ),
      lastDiscordSyncAt: Schema.optionalKey(
        Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
      ),
      lastDiscordAttemptAt: Schema.optionalKey(
        Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
      ),
      lastDiscordStatus: Schema.optionalKey(
        Schema.Union([Schema.String, Schema.Null]),
      ),
      isStale: Schema.optionalKey(Schema.Boolean),
      staleWarning: Schema.optionalKey(Schema.String),
      refreshQueued: Schema.optionalKey(Schema.Boolean),
      nextRefreshAt: Schema.optionalKey(
        Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableMemberResponseDto" });

export type MemberResponseDto = {
  readonly id: number;
  readonly userId: string;
  readonly guildId: string;
  readonly type: "OWNER" | "ADMIN" | "USER" | "BOT";
  readonly name: string;
  readonly avatar?: string | null;
  readonly banner?: string | null;
  readonly active: boolean;
  readonly roles: ReadonlyArray<{
    readonly id: string;
    readonly guildId: string;
    readonly name: string;
    readonly color: number | null;
    readonly position?: number | null;
    readonly permissions: ReadonlyArray<
      | "OWNER"
      | "ADMIN"
      | "LOOTLOG_MANAGE"
      | "LOOTLOG_ACCESS"
      | "LOOTLOG_LOOTS_READ"
      | "LOOTLOG_LOOTS_WRITE"
      | "LOOTLOG_LOOTS_ARCHIVE"
      | "LOOTLOG_LOOTS_TITANS_READ"
      | "LOOTLOG_LOOTS_HEROES_READ"
      | "LOOTLOG_TIMERS_READ"
      | "LOOTLOG_TIMERS_WRITE"
      | "LOOTLOG_TIMERS_RESET"
      | "LOOTLOG_TIMERS_DELETE"
      | "LOOTLOG_TIMERS_TITANS_READ"
      | "LOOTLOG_TIMERS_HEROES_READ"
      | "LOOTLOG_RESERVATIONS_READ"
      | "LOOTLOG_RESERVATIONS_WRITE"
      | "LOOTLOG_MEMBERS_READ"
      | "LOOTLOG_ONLINE_PLAYERS_READ"
      | "LOOTLOG_PRESENCE_LOCATION_READ"
      | "LOOTLOG_CHAT_READ"
      | "LOOTLOG_CHAT_WRITE"
      | "LOOTLOG_CHAT_TITANS_READ"
      | "LOOTLOG_CHAT_HEROES_READ"
      | "LOOTLOG_NOTIFICATIONS_READ"
      | "LOOTLOG_NOTIFICATIONS_SEND"
      | "LOOTLOG_NOTIFICATIONS_TITANS_READ"
      | "LOOTLOG_NOTIFICATIONS_HEROES_READ"
      | "LOOTLOG_EVENTS_MANAGE"
      | "LOOTLOG_EVENTS_READ"
      | "LOOTLOG_EVENTS_WRITE"
      | "LOOTLOG_DOCS_READ"
      | "LOOTLOG_DOCS_WRITE"
    >;
    readonly lvlRangeFrom?: number | null;
    readonly lvlRangeTo?: number | null;
  }>;
  readonly globalUserId?: string | null;
  readonly lastDiscordSyncAt?: string | null;
  readonly lastDiscordAttemptAt?: string | null;
  readonly lastDiscordStatus?: string | null;
  readonly isStale?: boolean;
  readonly staleWarning?: string;
  readonly refreshQueued?: boolean;
  readonly nextRefreshAt?: string | null;
  readonly updatedAt: string;
};

export const MemberResponseDto = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  userId: Schema.String,
  guildId: Schema.String,
  type: Schema.Literals(["OWNER", "ADMIN", "USER", "BOT"]),
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  banner: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  active: Schema.Boolean,
  roles: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      guildId: Schema.String,
      name: Schema.String,
      color: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      position: Schema.optionalKey(
        Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      ),
      permissions: Schema.Array(
        Schema.Literals([
          "OWNER",
          "ADMIN",
          "LOOTLOG_MANAGE",
          "LOOTLOG_ACCESS",
          "LOOTLOG_LOOTS_READ",
          "LOOTLOG_LOOTS_WRITE",
          "LOOTLOG_LOOTS_ARCHIVE",
          "LOOTLOG_LOOTS_TITANS_READ",
          "LOOTLOG_LOOTS_HEROES_READ",
          "LOOTLOG_TIMERS_READ",
          "LOOTLOG_TIMERS_WRITE",
          "LOOTLOG_TIMERS_RESET",
          "LOOTLOG_TIMERS_DELETE",
          "LOOTLOG_TIMERS_TITANS_READ",
          "LOOTLOG_TIMERS_HEROES_READ",
          "LOOTLOG_RESERVATIONS_READ",
          "LOOTLOG_RESERVATIONS_WRITE",
          "LOOTLOG_MEMBERS_READ",
          "LOOTLOG_ONLINE_PLAYERS_READ",
          "LOOTLOG_PRESENCE_LOCATION_READ",
          "LOOTLOG_CHAT_READ",
          "LOOTLOG_CHAT_WRITE",
          "LOOTLOG_CHAT_TITANS_READ",
          "LOOTLOG_CHAT_HEROES_READ",
          "LOOTLOG_NOTIFICATIONS_READ",
          "LOOTLOG_NOTIFICATIONS_SEND",
          "LOOTLOG_NOTIFICATIONS_TITANS_READ",
          "LOOTLOG_NOTIFICATIONS_HEROES_READ",
          "LOOTLOG_EVENTS_MANAGE",
          "LOOTLOG_EVENTS_READ",
          "LOOTLOG_EVENTS_WRITE",
          "LOOTLOG_DOCS_READ",
          "LOOTLOG_DOCS_WRITE",
        ]),
      ),
      lvlRangeFrom: Schema.optionalKey(
        Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      ),
      lvlRangeTo: Schema.optionalKey(
        Schema.Union([
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          Schema.Null,
        ]),
      ),
    }),
  ),
  globalUserId: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  lastDiscordSyncAt: Schema.optionalKey(
    Schema.Union([
      Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      Schema.Null,
    ]),
  ),
  lastDiscordAttemptAt: Schema.optionalKey(
    Schema.Union([
      Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      Schema.Null,
    ]),
  ),
  lastDiscordStatus: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Null]),
  ),
  isStale: Schema.optionalKey(Schema.Boolean),
  staleWarning: Schema.optionalKey(Schema.String),
  refreshQueued: Schema.optionalKey(Schema.Boolean),
  nextRefreshAt: Schema.optionalKey(
    Schema.Union([
      Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      Schema.Null,
    ]),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
}).annotate({ identifier: "MemberResponseDto" });

export type MemberLootlogConfigSummaryResponseDto_Output = {
  readonly memberUserId: string;
  readonly guildId: string;
  readonly isActive: boolean;
  readonly configuredCharacterCount: number;
  readonly enabledCharacterCount: number;
  readonly characters: ReadonlyArray<{
    readonly accountId: string;
    readonly characterId: string;
    readonly enabledForGuild: boolean;
    readonly characterName: string | null;
    readonly world: string | null;
    readonly icon: string | null;
    readonly metadataStatus:
      | "resolved"
      | "missing_snapshot"
      | "invalid_character_ref";
  }>;
};

export const MemberLootlogConfigSummaryResponseDto_Output = Schema.Struct({
  memberUserId: Schema.String,
  guildId: Schema.String,
  isActive: Schema.Boolean,
  configuredCharacterCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  enabledCharacterCount: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  characters: Schema.Array(
    Schema.Struct({
      accountId: Schema.String,
      characterId: Schema.String,
      enabledForGuild: Schema.Boolean,
      characterName: Schema.Union([Schema.String, Schema.Null]),
      world: Schema.Union([Schema.String, Schema.Null]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      metadataStatus: Schema.Literals([
        "resolved",
        "missing_snapshot",
        "invalid_character_ref",
      ]),
    }),
  ),
}).annotate({ identifier: "MemberLootlogConfigSummaryResponseDto_Output" });

export type MemberReferenceResponseDto_Output = {
  readonly id: number;
  readonly userId: string;
  readonly name: string;
  readonly avatar?: string | null;
  readonly color: number | null;
  readonly active: boolean;
};

export const MemberReferenceResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  active: Schema.Boolean,
}).annotate({ identifier: "MemberReferenceResponseDto_Output" });

export type MemberSummaryResponseDto_Output = {
  readonly id: number;
  readonly userId: string;
  readonly name: string;
  readonly avatar?: string | null;
  readonly color?: number | null;
};

export const MemberSummaryResponseDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  userId: Schema.String,
  name: Schema.String,
  avatar: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  color: Schema.optionalKey(
    Schema.Union([
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      Schema.Null,
    ]),
  ),
}).annotate({ identifier: "MemberSummaryResponseDto_Output" });

export type MemberRefreshJobResponseDto = {
  readonly id: number;
  readonly guildId: string;
  readonly status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  readonly totalMembers: number;
  readonly processedMembers: number;
  readonly failedMembers: number;
  readonly createdAt: string;
  readonly nextAvailableAt: string;
  readonly completedAt?: string | null;
};

export const MemberRefreshJobResponseDto = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.String,
  status: Schema.Literals(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  totalMembers: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  processedMembers: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  failedMembers: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  nextAvailableAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  completedAt: Schema.optionalKey(
    Schema.Union([
      Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      Schema.Null,
    ]),
  ),
}).annotate({ identifier: "MemberRefreshJobResponseDto" });

export type NullableMemberRefreshJobResponseDto =
  | ({
      readonly id: number;
      readonly guildId: string;
      readonly status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
      readonly totalMembers: number;
      readonly processedMembers: number;
      readonly failedMembers: number;
      readonly createdAt: string;
      readonly nextAvailableAt: string;
      readonly completedAt?: string | null;
    } & { readonly [x: string]: Schema.Json })
  | null;

export const NullableMemberRefreshJobResponseDto = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      guildId: Schema.String,
      status: Schema.Literals(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
      totalMembers: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      processedMembers: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      failedMembers: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      nextAvailableAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      completedAt: Schema.optionalKey(
        Schema.Union([
          Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          Schema.Null,
        ]),
      ),
    }),
    [
      Schema.Record(
        Schema.String,
        Schema.Json.annotate({ expected: "JSON value" }),
      ),
    ],
  ),
  Schema.Null,
]).annotate({ identifier: "NullableMemberRefreshJobResponseDto" });

export type MembersControllerGetMePathParams = { readonly guildId: string };

export const MembersControllerGetMePathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type MembersControllerGetMe200 = NullableMemberResponseDto;

export const MembersControllerGetMe200 = NullableMemberResponseDto;

export type MembersControllerRefreshMePathParams = { readonly guildId: string };

export const MembersControllerRefreshMePathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type MembersControllerRefreshMe200 = NullableMemberResponseDto;

export const MembersControllerRefreshMe200 = NullableMemberResponseDto;

export type MembersControllerRefreshMemberPathParams = {
  readonly discordId: string;
  readonly guildId: Schema.Json;
};

export const MembersControllerRefreshMemberPathParams = Schema.Struct({
  discordId: Schema.String.annotate({ examples: ["user_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerRefreshMember200 = NullableMemberResponseDto;

export const MembersControllerRefreshMember200 = NullableMemberResponseDto;

export type MembersControllerDeactivateMemberPathParams = {
  readonly discordId: string;
  readonly guildId: Schema.Json;
};

export const MembersControllerDeactivateMemberPathParams = Schema.Struct({
  discordId: Schema.String.annotate({ examples: ["user_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerDeactivateMember200 = MemberResponseDto;

export const MembersControllerDeactivateMember200 = MemberResponseDto;

export type MembersControllerGetMemberLootlogConfigSummaryPathParams = {
  readonly discordId: string;
  readonly guildId: Schema.Json;
};

export const MembersControllerGetMemberLootlogConfigSummaryPathParams =
  Schema.Struct({
    discordId: Schema.String.annotate({ examples: ["user_123"] }),
    guildId: Schema.Json.annotate({ expected: "JSON value" }),
  });

export type MembersControllerGetMemberLootlogConfigSummary200 =
  MemberLootlogConfigSummaryResponseDto_Output;

export const MembersControllerGetMemberLootlogConfigSummary200 =
  MemberLootlogConfigSummaryResponseDto_Output;

export type MembersControllerGetGuildMembersPathParams = {
  readonly guildId: Schema.Json;
};

export const MembersControllerGetGuildMembersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetGuildMembersQuery = {
  readonly includeInactive?: boolean;
};

export const MembersControllerGetGuildMembersQuery = Schema.Struct({
  includeInactive: Schema.optionalKey(Schema.Boolean),
});

export type MembersControllerGetGuildMembers200 =
  ReadonlyArray<MemberResponseDto>;

export const MembersControllerGetGuildMembers200 =
  Schema.Array(MemberResponseDto);

export type MembersControllerGetGuildMemberReferencesPathParams = {
  readonly guildId: Schema.Json;
};

export const MembersControllerGetGuildMemberReferencesPathParams =
  Schema.Struct({ guildId: Schema.Json.annotate({ expected: "JSON value" }) });

export type MembersControllerGetGuildMemberReferencesQuery = {
  readonly includeInactive?: boolean;
};

export const MembersControllerGetGuildMemberReferencesQuery = Schema.Struct({
  includeInactive: Schema.optionalKey(Schema.Boolean),
});

export type MembersControllerGetGuildMemberReferences200 =
  ReadonlyArray<MemberReferenceResponseDto_Output>;

export const MembersControllerGetGuildMemberReferences200 = Schema.Array(
  MemberReferenceResponseDto_Output,
);

export type MembersControllerGetGuildMembersSummaryPathParams = {
  readonly guildId: Schema.Json;
};

export const MembersControllerGetGuildMembersSummaryPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetGuildMembersSummary200 =
  ReadonlyArray<MemberSummaryResponseDto_Output>;

export const MembersControllerGetGuildMembersSummary200 = Schema.Array(
  MemberSummaryResponseDto_Output,
);

export type MembersControllerRefreshAllMembersPathParams = {
  readonly guildId: Schema.Json;
};

export const MembersControllerRefreshAllMembersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerRefreshAllMembers201 = MemberRefreshJobResponseDto;

export const MembersControllerRefreshAllMembers201 =
  MemberRefreshJobResponseDto;

export type MembersControllerGetLatestRefreshJobPathParams = {
  readonly guildId: Schema.Json;
};

export const MembersControllerGetLatestRefreshJobPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetLatestRefreshJob200 =
  NullableMemberRefreshJobResponseDto;

export const MembersControllerGetLatestRefreshJob200 =
  NullableMemberRefreshJobResponseDto;

export type MembersControllerGetRefreshJobStatusPathParams = {
  readonly jobId: number;
  readonly guildId: Schema.Json;
};

export const MembersControllerGetRefreshJobStatusPathParams = Schema.Struct({
  jobId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type MembersControllerGetRefreshJobStatus200 =
  MemberRefreshJobResponseDto;

export const MembersControllerGetRefreshJobStatus200 =
  MemberRefreshJobResponseDto;
