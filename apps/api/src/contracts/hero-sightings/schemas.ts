/** Shared input and output schemas for hero sightings. */
import * as Schema from "effect/Schema";
import {
  HeroSightingCloseReasonSchema,
  HeroSightingStateSchema,
} from "@lootlog/schema/hero-sightings";
import { ProfessionSchema } from "@lootlog/schema/loot";
import {
  DateTimeString,
  FiniteNumber,
  NonEmptyString,
  PositiveSafeInteger,
  WorldParam,
} from "@lootlog/schema/http-scalars";
import { TimerActorCharacterInput } from "#src/contracts/timers/schemas";

const HeroSightingMember = Schema.Struct({
  memberId: FiniteNumber,
  userId: Schema.NullOr(Schema.String).annotate({
    description:
      "Internal Lootlog User id of the Member, or null for a Member that never signed in.",
  }),
  displayName: Schema.String,
  avatarUrl: Schema.NullOr(Schema.String),
}).annotate({ identifier: "HeroSightingMemberDto" });

const HeroSightingCharacter = Schema.Struct({
  name: Schema.String,
  lvl: Schema.NullOr(FiniteNumber),
  prof: Schema.NullOr(ProfessionSchema),
  icon: Schema.NullOr(Schema.String),
});

export type HeroSightingResponse = typeof HeroSightingResponse.Type;

export const HeroSightingResponse = Schema.Struct({
  id: FiniteNumber,
  guildId: Schema.String,
  world: Schema.String,
  hero: Schema.Struct({
    key: Schema.String,
    name: Schema.String,
    lvl: FiniteNumber,
    prof: Schema.NullOr(ProfessionSchema),
  }),
  state: HeroSightingStateSchema,
  mapName: Schema.String.annotate({
    description:
      "Map name from the detector answer. Margonem sends no map id, and several maps can share a name.",
  }),
  firstSeenAt: DateTimeString,
  lastSeenAt: DateTimeString,
  spawnedAt: Schema.NullOr(DateTimeString).annotate({
    description: "When a detected spawn was first reported roaming.",
  }),
  closedAt: Schema.NullOr(DateTimeString),
  closeReason: Schema.NullOr(HeroSightingCloseReasonSchema).annotate({
    description:
      "PROBABLY_KILLED when a later detection contradicted the sighting; KILLED when Lootlog recorded the kill.",
  }),
  detectedBy: HeroSightingMember,
  detectorCharacter: Schema.NullOr(HeroSightingCharacter),
  lastSeenBy: HeroSightingMember,
  claims: Schema.Array(
    Schema.Struct({
      member: HeroSightingMember,
      character: Schema.NullOr(HeroSightingCharacter),
      createdAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "HeroSightingResponseDto" });

export type HeroSightingsResponse = typeof HeroSightingsResponse.Type;

export const HeroSightingsResponse = Schema.Array(HeroSightingResponse);

export type CreateHeroSightingRequest = typeof CreateHeroSightingRequest.Type;

const BoundedText = (maxLength: number) =>
  NonEmptyString.check(
    Schema.isMaxLength(maxLength).annotate({
      expected: `a value with a length of at most ${maxLength}`,
    }),
  );

export const CreateHeroSightingRequest = Schema.Struct({
  world: WorldParam,
  accountId: NonEmptyString,
  characterId: NonEmptyString,
  actorCharacter: Schema.optionalKey(TimerActorCharacterInput),
  hero: Schema.Struct({
    name: BoundedText(100),
    lvl: PositiveSafeInteger,
    prof: Schema.optionalKey(
      Schema.String.annotate({
        description: "Margonem profession shortname from the detector answer.",
      }),
    ),
  }),
  state: HeroSightingStateSchema,
  mapName: BoundedText(200),
  observedAt: DateTimeString.annotate({
    description:
      "When Margonem answered the detector, from the system chat message time.",
  }),
}).annotate({ identifier: "CreateHeroSightingDto" });

export type CreateHeroSightingResponse = typeof CreateHeroSightingResponse.Type;

export const CreateHeroSightingResponse = Schema.Struct({
  submittedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      // The hero's current sighting after this detection; an older
      // contradicting detection leaves the newer one current. Omitted when
      // the caller's roles cannot see this hero in the Organization.
      sighting: Schema.optionalKey(HeroSightingResponse),
    }),
  ),
  rejectedGuilds: Schema.Array(
    Schema.Struct({
      guildId: Schema.String,
      guildName: Schema.String,
      reason: Schema.Literals([
        "NOT_ON_CATCHING_WHITELIST",
        "SIGHTING_SUBMIT_FAILED",
      ]),
    }),
  ),
}).annotate({ identifier: "CreateHeroSightingResponseDto" });

export type HeroSightingsQuery = typeof HeroSightingsQuery.Type;

export const HeroSightingsQuery = Schema.Struct({ world: WorldParam });

export type HeroSightingHistoryQuery = typeof HeroSightingHistoryQuery.Type;

export const HeroSightingHistoryQuery = Schema.Struct({
  world: WorldParam,
  hero: NonEmptyString.annotate({
    description: "Hero key (`hero.key`) or hero name.",
  }),
});

export type HeroSightingOrganizationPath =
  typeof HeroSightingOrganizationPath.Type;

export const HeroSightingOrganizationPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
});

export type HeroSightingPath = typeof HeroSightingPath.Type;

export const HeroSightingPath = Schema.Struct({
  guildId: Schema.String.annotate({ examples: ["guild_123"] }),
  // Bounded below the HeroSighting.id integer column.
  sightingId: Schema.String.check(Schema.isPattern(/^[1-9]\d{0,8}$/)),
});

export type ClaimHeroSightingRequest = typeof ClaimHeroSightingRequest.Type;

export const ClaimHeroSightingRequest = Schema.Struct({
  actorCharacter: Schema.optionalKey(TimerActorCharacterInput),
}).annotate({ identifier: "ClaimHeroSightingDto" });
