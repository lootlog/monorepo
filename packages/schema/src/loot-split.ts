import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

/**
 * A participant's choice for one item of a group loot split, as Margonem's
 * `loot.states` reports it: 0 "nie chcę", 1 "chcę", 2 "bardzo chcę".
 */
const LOOT_SPLIT_CHOICES = [0, 1, 2] as const;

export type LootSplitChoice = (typeof LOOT_SPLIT_CHOICES)[number];

/** A Margonem party holds at most ten characters, so nine other recipients. */
const MAX_LOOT_SPLIT_RECIPIENTS = 9;

/** Bounds a frame; one group loot holds far fewer items. */
const MAX_LOOT_SPLIT_ITEMS = 64;

const ITEM_ID_PATTERN = /^[1-9]\d{0,17}$/u;

const ItemIdSchema = Schema.String.check(Schema.isPattern(ITEM_ID_PATTERN));

const CharacterIdSchema = Schema.String.check(
  Schema.isPattern(/^[1-9]\d{0,9}$/u),
);

const RecipientCharacterIdsSchema = Schema.Array(CharacterIdSchema).check(
  Schema.isMinLength(1),
  Schema.isMaxLength(MAX_LOOT_SPLIT_RECIPIENTS),
);

const SenderSchema = Schema.Struct({
  characterId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
});

const LootSplitChoicesSchema = Schema.Record(
  Schema.String,
  Schema.Literals(LOOT_SPLIT_CHOICES),
).check(
  Schema.makeFilter((choices: Readonly<Record<string, LootSplitChoice>>) => {
    const ids = Object.keys(choices);

    return (
      (ids.length <= MAX_LOOT_SPLIT_ITEMS &&
        ids.every((id) => ITEM_ID_PATTERN.test(id))) ||
      "choices must map at most 64 item ids"
    );
  }),
);

export interface LootSplitSendPayload {
  /** The smallest item id of the split: item ids are unique server-wide. */
  splitId: string;
  choices: Readonly<Record<string, LootSplitChoice>>;
  accepted: boolean;
  /** Character ids of the split's other participants, fixed when it opened. */
  recipientCharacterIds: readonly string[];
}

export interface LootSplitEvent {
  splitId: string;
  world: string;
  sender: {
    characterId: string;
    name: string;
  };
  choices: Readonly<Record<string, LootSplitChoice>>;
  accepted: boolean;
  sentAt: number;
}

/**
 * Sent by a participant whose Margonem loot filter accepted the split for
 * them: the game then opens no loot window and tells that client neither the
 * items nor the choices, so the split has no id it could name.
 */
export interface LootSplitAutoAcceptPayload {
  /** Character ids of the fight's other players. */
  recipientCharacterIds: readonly string[];
}

export interface LootSplitAutoAcceptedEvent {
  world: string;
  sender: {
    characterId: string;
    name: string;
  };
  sentAt: number;
}

export type LootSplitAck =
  | { status: "accepted" }
  | {
      status: "rejected";
      code:
        | "forbidden"
        | "invalid-context"
        | "invalid-payload"
        | "rate-limited"
        | "temporarily-unavailable";
      retryAfterMs?: number;
    };

export const LootSplitSendPayloadSchema = Schema.Struct({
  splitId: ItemIdSchema,
  choices: LootSplitChoicesSchema,
  accepted: Schema.Boolean,
  recipientCharacterIds: RecipientCharacterIdsSchema,
});

export const LootSplitEventSchema = Schema.Struct({
  splitId: ItemIdSchema,
  world: Schema.NonEmptyString,
  sender: SenderSchema,
  choices: LootSplitChoicesSchema,
  accepted: Schema.Boolean,
  sentAt: NonNegativeInt,
});

export const LootSplitAutoAcceptPayloadSchema = Schema.Struct({
  recipientCharacterIds: RecipientCharacterIdsSchema,
});

export const LootSplitAutoAcceptedEventSchema = Schema.Struct({
  world: Schema.NonEmptyString,
  sender: SenderSchema,
  sentAt: NonNegativeInt,
});

export const LootSplitAckSchema = Schema.Union([
  Schema.Struct({ status: Schema.Literal("accepted") }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    code: Schema.Literals([
      "forbidden",
      "invalid-context",
      "invalid-payload",
      "rate-limited",
      "temporarily-unavailable",
    ]),
    retryAfterMs: Schema.optionalKey(NonNegativeInt),
  }),
]);
