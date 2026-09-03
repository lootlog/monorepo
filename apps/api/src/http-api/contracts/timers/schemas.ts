/** Transport schemas owned by the timers HTTP module. */
import * as Schema from "effect/Schema";

export type TimerResponseDto = {
  readonly guildId: string;
  readonly npcId: number;
  readonly timerKey: string;
  readonly world: string;
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly npc: {
    readonly id: number;
    readonly name: string;
    readonly prof: string;
    readonly location: string;
    readonly wt: string;
    readonly lvl: number;
    readonly type:
      | "COMMON"
      | "ELITE"
      | "ELITE2"
      | "ELITE3"
      | "HERO"
      | "EVENT_HERO"
      | "TITAN"
      | "COLOSSUS"
      | "NPC";
    readonly icon: string | null;
    readonly margonemType: string;
  };
  readonly wasReset: boolean;
  readonly member?: {
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
  readonly actorCharacter?: {
    readonly name: string;
    readonly prof:
      | "WARRIOR"
      | "PALADIN"
      | "HUNTER"
      | "MAGE"
      | "BLADE_DANCER"
      | "TRACKER"
      | null;
    readonly icon: string | null;
    readonly lvl: number | null;
    readonly characterId: number;
    readonly accountId: number;
  };
  readonly deletedAt?: string | null;
  readonly updatedAt: string;
};

export const TimerResponseDto = Schema.Struct({
  guildId: Schema.String,
  npcId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  timerKey: Schema.String,
  world: Schema.String,
  minSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  maxSpawnTime: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  npc: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String,
    prof: Schema.String,
    location: Schema.String,
    wt: Schema.String,
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    type: Schema.Literals([
      "COMMON",
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "TITAN",
      "COLOSSUS",
      "NPC",
    ]),
    icon: Schema.Union([Schema.String, Schema.Null]),
    margonemType: Schema.String,
  }),
  wasReset: Schema.Boolean,
  member: Schema.optionalKey(
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
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String,
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      lvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      characterId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  deletedAt: Schema.optionalKey(
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
}).annotate({ identifier: "TimerResponseDto" });

export type TimerHistoryResponseDto = {
  readonly id: number;
  readonly guildId: string;
  readonly guildName: string;
  readonly world: string;
  readonly timerKey: string;
  readonly npcId: number;
  readonly npc: {
    readonly id: number;
    readonly name: string;
    readonly prof: string;
    readonly location: string;
    readonly wt: string;
    readonly lvl: number;
    readonly type:
      | "COMMON"
      | "ELITE"
      | "ELITE2"
      | "ELITE3"
      | "HERO"
      | "EVENT_HERO"
      | "TITAN"
      | "COLOSSUS"
      | "NPC";
    readonly icon: string | null;
    readonly margonemType: string;
  };
  readonly action: "CREATE" | "RESET" | "DELETE" | "RESTORE";
  readonly member: {
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
  readonly actorCharacter?: {
    readonly name: string;
    readonly prof:
      | "WARRIOR"
      | "PALADIN"
      | "HUNTER"
      | "MAGE"
      | "BLADE_DANCER"
      | "TRACKER"
      | null;
    readonly icon: string | null;
    readonly lvl: number | null;
    readonly characterId: number;
    readonly accountId: number;
  };
  readonly minSpawnTime: string | null;
  readonly maxSpawnTime: string | null;
  readonly canRestore: boolean;
  readonly createdAt: string;
};

export const TimerHistoryResponseDto = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  guildId: Schema.String,
  guildName: Schema.String,
  world: Schema.String,
  timerKey: Schema.String,
  npcId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  npc: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String,
    prof: Schema.String,
    location: Schema.String,
    wt: Schema.String,
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    type: Schema.Literals([
      "COMMON",
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "TITAN",
      "COLOSSUS",
      "NPC",
    ]),
    icon: Schema.Union([Schema.String, Schema.Null]),
    margonemType: Schema.String,
  }),
  action: Schema.Literals(["CREATE", "RESET", "DELETE", "RESTORE"]),
  member: Schema.Struct({
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
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      name: Schema.String,
      prof: Schema.Union([
        Schema.Literals([
          "WARRIOR",
          "PALADIN",
          "HUNTER",
          "MAGE",
          "BLADE_DANCER",
          "TRACKER",
        ]),
        Schema.Null,
      ]),
      icon: Schema.Union([Schema.String, Schema.Null]),
      lvl: Schema.Union([
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        Schema.Null,
      ]),
      characterId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    }),
  ),
  minSpawnTime: Schema.Union([
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
  maxSpawnTime: Schema.Union([
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
  canRestore: Schema.Boolean,
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
}).annotate({ identifier: "TimerHistoryResponseDto" });

export type SearchTimersNpcResponseDto_Output = {
  readonly npcId: number;
  readonly timerKey: string;
  readonly name: string;
  readonly lvl: number;
  readonly type:
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "TITAN"
    | "COLOSSUS"
    | "NPC";
  readonly prof: string;
  readonly location: string;
  readonly wt: string | number;
  readonly icon: string;
  readonly latestRespBaseSeconds: number | null;
  readonly latestRespawnRandomness: number | null;
};

export const SearchTimersNpcResponseDto_Output = Schema.Struct({
  npcId: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  timerKey: Schema.String,
  name: Schema.String,
  lvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  type: Schema.Literals([
    "COMMON",
    "ELITE",
    "ELITE2",
    "ELITE3",
    "HERO",
    "EVENT_HERO",
    "TITAN",
    "COLOSSUS",
    "NPC",
  ]),
  prof: Schema.String,
  location: Schema.String,
  wt: Schema.Union([
    Schema.String,
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ]),
  icon: Schema.String,
  latestRespBaseSeconds: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
  latestRespawnRandomness: Schema.Union([
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    Schema.Null,
  ]),
}).annotate({ identifier: "SearchTimersNpcResponseDto_Output" });

export type CreateTimerFromGameClientDto = {
  readonly respBaseSeconds: number;
  readonly respawnRandomness?: number;
  readonly customMinSpawnTime?: string;
  readonly customMaxSpawnTime?: string;
  readonly world: string;
  readonly npc: {
    readonly id: number;
    readonly name: string;
    readonly location: string;
    readonly lvl: number;
    readonly prof?: string;
    readonly wt: number;
    readonly hpp?: number;
    readonly icon: string;
    readonly type: number;
    readonly x?: number;
    readonly y?: number;
  };
  readonly characterId: string;
  readonly accountId: string;
  readonly actorCharacter?: {
    readonly accountId: string;
    readonly characterId: string;
    readonly name: string;
    readonly prof?: string;
    readonly icon?: string;
    readonly lvl?: number;
  };
};

export const CreateTimerFromGameClientDto = Schema.Struct({
  respBaseSeconds: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ).check(
    Schema.isGreaterThanOrEqualTo(2).annotate({
      expected: "a value greater than or equal to 2",
    }),
  ),
  respawnRandomness: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  customMinSpawnTime: Schema.optionalKey(
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
  ),
  customMaxSpawnTime: Schema.optionalKey(
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
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  npc: Schema.Struct({
    id: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    name: Schema.String,
    location: Schema.String,
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    prof: Schema.optionalKey(Schema.String),
    wt: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    hpp: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
    icon: Schema.String,
    type: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    x: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
    y: Schema.optionalKey(
      Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
    ),
  }),
  characterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  accountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
      ),
    }),
  ),
}).annotate({ identifier: "CreateTimerFromGameClientDto" });

export type CreateAutoTimerResponseDto_Output = {
  readonly submittedGuilds: ReadonlyArray<{
    readonly guildId: string;
    readonly guildName: string;
  }>;
  readonly rejectedGuilds: ReadonlyArray<{
    readonly guildId: string;
    readonly guildName: string;
    readonly reason: "NOT_ON_CATCHING_WHITELIST" | "TIMER_CREATE_FAILED";
  }>;
};

export const CreateAutoTimerResponseDto_Output = Schema.Struct({
  submittedGuilds: Schema.Array(
    Schema.Struct({ guildId: Schema.String, guildName: Schema.String }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      reason: Schema.Literals([
        "NOT_ON_CATCHING_WHITELIST",
        "TIMER_CREATE_FAILED",
      ]),
    }),
  ),
}).annotate({ identifier: "CreateAutoTimerResponseDto_Output" });

export type ResetTimerDto = {
  readonly world: string;
  readonly actorCharacter?: {
    readonly accountId: string;
    readonly characterId: string;
    readonly name: string;
    readonly prof?: string;
    readonly icon?: string;
    readonly lvl?: number;
  };
};

export const ResetTimerDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
      ),
    }),
  ),
}).annotate({ identifier: "ResetTimerDto" });

export type CreateManualTimerDto = {
  readonly name: string;
  readonly minSeconds?: number;
  readonly maxSeconds?: number;
  readonly lvl?: number;
  readonly prof?: string;
  readonly type?: "ELITE2" | "ELITE3" | "HERO" | "TITAN";
  readonly customMinSpawnTime?: string;
  readonly customMaxSpawnTime?: string;
  readonly world: string;
  readonly actorCharacter?: {
    readonly accountId: string;
    readonly characterId: string;
    readonly name: string;
    readonly prof?: string;
    readonly icon?: string;
    readonly lvl?: number;
  };
};

export const CreateManualTimerDto = Schema.Struct({
  name: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  minSeconds: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ).check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ),
  ),
  maxSeconds: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ).check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ),
  ),
  lvl: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  prof: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(
    Schema.Literals(["ELITE2", "ELITE3", "HERO", "TITAN"]),
  ),
  customMinSpawnTime: Schema.optionalKey(
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
  ),
  customMaxSpawnTime: Schema.optionalKey(
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
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  actorCharacter: Schema.optionalKey(
    Schema.Struct({
      accountId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      characterId: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
      name: Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ).check(
        Schema.isMaxLength(50).annotate({
          expected: "a value with a length of at most 50",
        }),
      ),
      prof: Schema.optionalKey(Schema.String),
      icon: Schema.optionalKey(Schema.String),
      lvl: Schema.optionalKey(
        Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
      ),
    }),
  ),
}).annotate({ identifier: "CreateManualTimerDto" });

export type TimersControllerGetAllTimersQuery = { readonly world?: string };

export const TimersControllerGetAllTimersQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetAllTimers200 = ReadonlyArray<TimerResponseDto>;

export const TimersControllerGetAllTimers200 = Schema.Array(TimerResponseDto);

export type TimersControllerGetRecentTimerHistoryQuery = {
  readonly guildId: string;
  readonly world: string;
  readonly limit?: Schema.Json;
};

export const TimersControllerGetRecentTimerHistoryQuery = Schema.Struct({
  guildId: Schema.String,
  world: Schema.String,
  limit: Schema.optionalKey(Schema.Json.annotate({ expected: "JSON value" })),
});

export type TimersControllerGetRecentTimerHistory200 =
  ReadonlyArray<TimerHistoryResponseDto>;

export const TimersControllerGetRecentTimerHistory200 = Schema.Array(
  TimerHistoryResponseDto,
);

export type TimersControllerGetTimersPathParams = {
  readonly guildId: Schema.Json;
};

export const TimersControllerGetTimersPathParams = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type TimersControllerGetTimersQuery = { readonly world?: string };

export const TimersControllerGetTimersQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetTimers200 = ReadonlyArray<TimerResponseDto>;

export const TimersControllerGetTimers200 = Schema.Array(TimerResponseDto);

export type TimersControllerSearchNpcsWithTimerDataPathParams = {
  readonly guildId: string;
};

export const TimersControllerSearchNpcsWithTimerDataPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimersControllerSearchNpcsWithTimerDataQuery = {
  readonly search: string;
  readonly world: string;
  readonly limit?: number;
};

export const TimersControllerSearchNpcsWithTimerDataQuery = Schema.Struct({
  search: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 })
      .check(Schema.isFinite().annotate({ expected: "a finite number" }))
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(50).annotate({
          expected: "a value less than or equal to 50",
        }),
      ),
  ),
});

export type TimersControllerSearchNpcsWithTimerData200 =
  ReadonlyArray<SearchTimersNpcResponseDto_Output>;

export const TimersControllerSearchNpcsWithTimerData200 = Schema.Array(
  SearchTimersNpcResponseDto_Output,
);

export type TimersControllerCreateAutoTimerRequestJson =
  CreateTimerFromGameClientDto;

export const TimersControllerCreateAutoTimerRequestJson =
  CreateTimerFromGameClientDto;

export type TimersControllerCreateAutoTimer201 =
  CreateAutoTimerResponseDto_Output;

export const TimersControllerCreateAutoTimer201 =
  CreateAutoTimerResponseDto_Output;

export type TimersControllerResetTimerPathParams = {
  readonly guildId: string;
  readonly timerIdentifier: string;
};

export const TimersControllerResetTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerResetTimerRequestJson = ResetTimerDto;

export const TimersControllerResetTimerRequestJson = ResetTimerDto;

export type TimersControllerResetTimer200 = TimerResponseDto;

export const TimersControllerResetTimer200 = TimerResponseDto;

export type TimersControllerDeleteTimerPathParams = {
  readonly guildId: string;
  readonly timerIdentifier: string;
};

export const TimersControllerDeleteTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerDeleteTimerQuery = { readonly world?: string };

export const TimersControllerDeleteTimerQuery = Schema.Struct({
  world: Schema.optionalKey(Schema.String),
});

export type TimersControllerGetTimerHistoryPathParams = {
  readonly guildId: string;
  readonly timerIdentifier: string;
};

export const TimersControllerGetTimerHistoryPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  timerIdentifier: Schema.String.annotate({ examples: ["12345:test boss"] }),
});

export type TimersControllerGetTimerHistoryQuery = {
  readonly world: string;
  readonly limit?: Schema.Json;
};

export const TimersControllerGetTimerHistoryQuery = Schema.Struct({
  world: Schema.String,
  limit: Schema.optionalKey(Schema.Json.annotate({ expected: "JSON value" })),
});

export type TimersControllerGetTimerHistory200 =
  ReadonlyArray<TimerHistoryResponseDto>;

export const TimersControllerGetTimerHistory200 = Schema.Array(
  TimerHistoryResponseDto,
);

export type TimersControllerRestoreTimerFromHistoryPathParams = {
  readonly guildId: string;
  readonly historyEntryId: string;
};

export const TimersControllerRestoreTimerFromHistoryPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  historyEntryId: Schema.String,
});

export type TimersControllerRestoreTimerFromHistory201 = TimerResponseDto;

export const TimersControllerRestoreTimerFromHistory201 = TimerResponseDto;

export type TimersControllerCreateManualTimerPathParams = {
  readonly guildId: string;
};

export const TimersControllerCreateManualTimerPathParams = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type TimersControllerCreateManualTimerRequestJson = CreateManualTimerDto;

export const TimersControllerCreateManualTimerRequestJson =
  CreateManualTimerDto;

export type TimersControllerCreateManualTimer201 = TimerResponseDto;

export const TimersControllerCreateManualTimer201 = TimerResponseDto;
