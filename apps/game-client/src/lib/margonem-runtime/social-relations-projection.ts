import type { GameEvent, OtherEntry } from "@lootlog/margonem/game-events";
import type {
  GameOther,
  LegacyGameOther,
  OtherHandle,
} from "@lootlog/margonem/others";
import { Option, Schema } from "effect";
import { chunk } from "es-toolkit";
import { useGameStore } from "@/store/game.store";
import {
  getSocialScopes,
  useSocialRelationsStore,
  type PlayerRelationObservation,
} from "@/store/social-relations.store";

// Row widths of the flattened lists, from Society.setHowRecordsOnPerson and
// Diplomacy.updateFriend / updateEnemy. Every row starts with the id.
const FRIEND_ROW = 11;

const ENEMY_ROW = 7;

const CLAN_ALLY_ROW = 4;

const CLAN_ENEMY_ROW = 6;

const rowIds = (list: readonly (number | string)[], rowWidth: number) =>
  chunk(list, rowWidth).map(([id]) => String(id ?? ""));

// Other.js merges each packet into the player's data, so a relation can come
// with the CREATE entry or with a later partial update of the same player.
const decodeRelatedPlayer = Schema.decodeUnknownOption(
  Schema.Struct({
    relation: Schema.Number,
    clan: Schema.optional(Schema.Struct({ id: Schema.Number })),
  }),
);

const toObservation = (
  characterId: string,
  data: OtherEntry | GameOther | LegacyGameOther,
): PlayerRelationObservation | null => {
  if (!("relation" in data)) return null;

  return Option.match(decodeRelatedPlayer(data), {
    onNone: () => null,
    onSome: ({ clan, relation }) => ({
      characterId,
      clanId: clan?.id,
      relation,
    }),
  });
};

const getActiveSocialScopes = () => {
  const game = useGameStore.getState().game;

  return getSocialScopes({
    accountId: game?.hero.accountId,
    characterId: game?.hero.characterId,
    clanId: game?.hero.clan?.id,
    world: game?.world,
  });
};

const observe = (observations: readonly PlayerRelationObservation[]) => {
  const scopes = getActiveSocialScopes();

  if (!scopes || observations.length === 0) return;
  useSocialRelationsStore.getState().observePlayers(scopes, observations);
};

/** Learns from the relation each player on the map arrives with. */
export function observeOtherEntries(
  others: Readonly<Record<string, OtherEntry>>,
): void {
  const observations: PlayerRelationObservation[] = [];

  for (const [characterId, entry] of Object.entries(others)) {
    const observation = toObservation(characterId, entry);

    if (observation) observations.push(observation);
  }

  observe(observations);
}

/** Learns from players who were already on the map when Lootlog started. */
export function observeOtherHandles(
  handles: Readonly<Record<string, OtherHandle>>,
): void {
  const observations: PlayerRelationObservation[] = [];

  for (const [characterId, handle] of Object.entries(handles)) {
    const observation = toObservation(
      characterId,
      "d" in handle ? handle.d : handle,
    );

    if (observation) observations.push(observation);
  }

  observe(observations);
}

/** Replaces the remembered lists the game sent in full. */
export function applySocialLists(event: GameEvent): void {
  if (!event.friends && !event.enemies && !event.clan_fr && !event.clan_en)
    return;

  const scopes = getActiveSocialScopes();

  if (!scopes) return;
  const store = useSocialRelationsStore.getState();

  if (event.friends)
    store.replaceCharacterList(
      scopes.character,
      "friends",
      rowIds(event.friends, FRIEND_ROW),
    );

  if (event.enemies)
    store.replaceCharacterList(
      scopes.character,
      "enemies",
      rowIds(event.enemies, ENEMY_ROW),
    );

  if (!scopes.clan) return;

  if (event.clan_fr)
    store.replaceClanDiplomacy(
      scopes.clan,
      "ally",
      rowIds(event.clan_fr, CLAN_ALLY_ROW),
    );

  if (event.clan_en)
    store.replaceClanDiplomacy(
      scopes.clan,
      "enemy",
      rowIds(event.clan_en, CLAN_ENEMY_ROW),
    );
}
