/** Input and output schemas of the global faction wars. */
import { Schema } from "effect";
import { IsoDateTime, NonNegativeInt } from "@lootlog/schema/primitives";
import {
  FactionWarFaction,
  FactionWarPointSource,
} from "@lootlog/domain/faction-war";

const FactionWarFactionSchema = Schema.Literals([
  FactionWarFaction.BARBATOS,
  FactionWarFaction.TANROTH,
]);

const FactionWarPointSourceSchema = Schema.Literals([
  FactionWarPointSource.KILL,
  FactionWarPointSource.LOOT,
  FactionWarPointSource.ONLINE,
  FactionWarPointSource.PVP,
]);

/**
 * Points one kill or loot added for the player's faction, so the Game client
 * can show them; absent when nothing counted (no pick, cap reached).
 */
export const FactionWarAwardResponse = Schema.Struct({
  faction: FactionWarFactionSchema,
  points: NonNegativeInt,
}).annotate({ identifier: "FactionWarAwardDto" });

const FactionWarStatus = Schema.Literals(["UPCOMING", "RUNNING", "ENDED"]);

const FactionTotal = Schema.Struct({
  faction: FactionWarFactionSchema,
  /** The war score: each day's points times that day's underdog multiplier. */
  points: NonNegativeInt,
  /** Points its players earned, before multipliers. */
  rawPoints: NonNegativeInt,
  players: NonNegativeInt,
  /** Multiplier of the latest day anyone scored; 1 for the larger faction. */
  multiplier: Schema.Finite,
}).annotate({ identifier: "FactionWarFactionTotalDto" });

const FactionWarScoringResponse = Schema.Struct({
  killPoints: Schema.Record(Schema.String, NonNegativeInt),
  lootPoints: Schema.Record(Schema.String, NonNegativeInt),
  onlineSecondsPerPoint: NonNegativeInt,
  pvpWinPoints: NonNegativeInt,
  underdogBonusCap: Schema.Finite,
  dailyCaps: Schema.Record(FactionWarPointSourceSchema, NonNegativeInt),
}).annotate({ identifier: "FactionWarScoringDto" });

/** What anyone may see about a war: its dates, rules and faction totals. */
export const PublicFactionWarResponse = Schema.Struct({
  id: Schema.String,
  status: FactionWarStatus,
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  scoring: FactionWarScoringResponse,
  totals: Schema.Array(FactionTotal),
  /** Factions with the highest score once the war ended; both on a tie. */
  winners: Schema.Array(FactionWarFactionSchema),
}).annotate({ identifier: "PublicFactionWarResponseDto" });

export type PublicFactionWarResponse = typeof PublicFactionWarResponse.Type;

const FactionWarDay = Schema.Struct({
  day: Schema.String,
  faction: FactionWarFactionSchema,
  /** Raw points of the day, before the multiplier. */
  points: NonNegativeInt,
  activePlayers: NonNegativeInt,
  multiplier: Schema.Finite,
  /** The day's points times its multiplier, as counted in the war score. */
  score: NonNegativeInt,
}).annotate({ identifier: "FactionWarDayDto" });

const MyFactionWarPick = Schema.Struct({
  faction: FactionWarFactionSchema,
  characterName: Schema.String,
  world: Schema.String,
  pickedAt: IsoDateTime,
  hiddenFromLeaderboard: Schema.Boolean,
  /** A war admin excluded the pick: it earns and counts nothing. */
  disqualified: Schema.Boolean,
  points: NonNegativeInt,
  todayBySource: Schema.Record(FactionWarPointSourceSchema, NonNegativeInt),
}).annotate({ identifier: "MyFactionWarPickDto" });

/** The finished war whose winners still wear its highlight, if any. */
const FactionWarChampion = Schema.Struct({
  warId: Schema.String,
  winners: Schema.Array(FactionWarFactionSchema),
  /** Whether the caller picked a winning faction in that war. */
  isChampion: Schema.Boolean,
  highlightHidden: Schema.Boolean,
}).annotate({ identifier: "FactionWarChampionDto" });

export const FactionWarResponse = Schema.Struct({
  ...PublicFactionWarResponse.fields,
  days: Schema.Array(FactionWarDay),
  pick: Schema.NullOr(MyFactionWarPick),
  champion: Schema.NullOr(FactionWarChampion),
  /** Whether the caller may disqualify players in faction wars. */
  isAdmin: Schema.Boolean,
}).annotate({ identifier: "FactionWarResponseDto" });

export type FactionWarResponse = typeof FactionWarResponse.Type;

export const FactionWarParams = Schema.Struct({ warId: Schema.String });

export const PickFactionRequest = Schema.Struct({
  faction: FactionWarFactionSchema,
  characterId: Schema.NonEmptyString,
  characterName: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
  world: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
}).annotate({ identifier: "PickFactionDto" });

export type PickFactionRequest = typeof PickFactionRequest.Type;

export const UpdateFactionWarPickRequest = Schema.Struct({
  hiddenFromLeaderboard: Schema.optionalKey(Schema.Boolean),
  championHighlightHidden: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "UpdateFactionWarPickDto" });

export type UpdateFactionWarPickRequest =
  typeof UpdateFactionWarPickRequest.Type;

export const FactionWarLeaderboardQuery = Schema.Struct({
  faction: FactionWarFactionSchema,
});

export const FactionWarLeaderboardResponse = Schema.Struct({
  faction: FactionWarFactionSchema,
  entries: Schema.Array(
    Schema.Struct({
      rank: NonNegativeInt,
      /** `null` for players who hid themselves from the leaderboard. */
      characterName: Schema.NullOr(Schema.String),
      world: Schema.NullOr(Schema.String),
      points: NonNegativeInt,
      isMe: Schema.Boolean,
      /** The player's User id, for war admins only; `null` for everyone else. */
      userId: Schema.NullOr(Schema.String),
    }).annotate({ identifier: "FactionWarLeaderboardEntryDto" }),
  ),
}).annotate({ identifier: "FactionWarLeaderboardResponseDto" });

export type FactionWarLeaderboardResponse =
  typeof FactionWarLeaderboardResponse.Type;

/** Characters the Game client highlights, grouped by their winning faction. */
export const FactionWarChampionsResponse = Schema.Struct({
  warId: Schema.NullOr(Schema.String),
  champions: Schema.Array(
    Schema.Struct({
      faction: FactionWarFactionSchema,
      characterIds: Schema.Array(Schema.String),
    }).annotate({ identifier: "FactionWarChampionGroupDto" }),
  ),
}).annotate({ identifier: "FactionWarChampionsResponseDto" });

export type FactionWarChampionsResponse =
  typeof FactionWarChampionsResponse.Type;

export const FactionWarChampionsQuery = Schema.Struct({
  /** The Margonem world the Game client plays on; champions of other worlds are left out. */
  world: Schema.NonEmptyString.check(Schema.isMaxLength(64)),
});

export const FactionWarDisqualificationParams = Schema.Struct({
  warId: Schema.String,
  userId: Schema.String,
});

export const DisqualifyFactionWarPlayerRequest = Schema.Struct({
  reason: Schema.NonEmptyString.check(Schema.isMaxLength(500)),
}).annotate({ identifier: "DisqualifyFactionWarPlayerDto" });

export type DisqualifyFactionWarPlayerRequest =
  typeof DisqualifyFactionWarPlayerRequest.Type;

export const FactionWarDisqualificationsResponse = Schema.Array(
  Schema.Struct({
    userId: Schema.String,
    faction: FactionWarFactionSchema,
    characterName: Schema.String,
    world: Schema.String,
    disqualifiedAt: IsoDateTime,
    reason: Schema.NullOr(Schema.String),
  }).annotate({ identifier: "FactionWarDisqualificationDto" }),
);

export type FactionWarDisqualificationsResponse =
  typeof FactionWarDisqualificationsResponse.Type;
