import { Option, Schema } from "effect";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { withFallback } from "@/lib/stored-value-schema";

/**
 * Margonem's `SocietyData.RELATION`: how the server relates a player on the
 * hero's map to the hero. Faction relations (7, 8) say nothing about friends
 * or clans, so they are not learned from.
 */
export const MARGONEM_RELATION = {
  NONE: 1,
  FRIEND: 2,
  ENEMY: 3,
  CLAN: 4,
  CLAN_ALLY: 5,
  CLAN_ENEMY: 6,
} as const;

export type ClanRelation = "ally" | "enemy";

type CharacterIds = Readonly<Record<string, true>>;

type CharacterSocial = Readonly<{
  enemies: CharacterIds;
  friends: CharacterIds;
}>;

type ClanDiplomacy = Readonly<Record<string, ClanRelation>>;

export type SocialScopes = Readonly<{
  /** The hero's own friends and enemies. */
  character: string;
  /** The diplomacy of the hero's clan; null without a clan. */
  clan: string | null;
}>;

export type PlayerRelationObservation = Readonly<{
  characterId: string;
  clanId?: number;
  relation: number;
}>;

type SocialRelationsState = {
  characters: Readonly<Record<string, CharacterSocial>>;
  clans: Readonly<Record<string, ClanDiplomacy>>;
  observePlayers: (
    scopes: SocialScopes,
    observations: readonly PlayerRelationObservation[],
  ) => void;
  replaceCharacterList: (
    characterScope: string,
    list: keyof CharacterSocial,
    characterIds: readonly string[],
  ) => void;
  replaceClanDiplomacy: (
    clanScope: string,
    relation: ClanRelation,
    clanIds: readonly string[],
  ) => void;
};

const EMPTY_CHARACTER_SOCIAL: CharacterSocial = Object.freeze({
  enemies: Object.freeze({}),
  friends: Object.freeze({}),
});

const EMPTY_CLAN_DIPLOMACY: ClanDiplomacy = Object.freeze({});

const toCharacterIds = (characterIds: readonly string[]): CharacterIds =>
  Object.freeze(
    Object.fromEntries(
      characterIds.flatMap((characterId) =>
        characterId ? [[characterId, true] as const] : [],
      ),
    ),
  );

/** Storage scopes of the active hero; null before the game is known. */
export const getSocialScopes = (hero: {
  accountId?: string;
  characterId?: string;
  clanId?: number;
  world?: string;
}): SocialScopes | null => {
  if (!hero.world || !hero.accountId || !hero.characterId) return null;

  return {
    character: JSON.stringify([hero.world, hero.accountId, hero.characterId]),
    clan:
      hero.clanId === undefined
        ? null
        : JSON.stringify([hero.world, String(hero.clanId)]),
  };
};

const withCharacterFlag = (
  ids: CharacterIds,
  characterId: string,
  present: boolean,
): CharacterIds => {
  if (Boolean(ids[characterId]) === present) return ids;

  if (present) return Object.freeze({ ...ids, [characterId]: true });

  const { [characterId]: _removed, ...rest } = ids;

  return Object.freeze(rest);
};

const withClanRelation = (
  diplomacy: ClanDiplomacy,
  clanId: string,
  relation: ClanRelation | undefined,
): ClanDiplomacy => {
  if (diplomacy[clanId] === relation) return diplomacy;

  if (relation) return Object.freeze({ ...diplomacy, [clanId]: relation });

  const { [clanId]: _removed, ...rest } = diplomacy;

  return Object.freeze(rest);
};

const observeCharacter = (
  social: CharacterSocial,
  { characterId, relation }: PlayerRelationObservation,
): CharacterSocial => {
  const isFriend =
    relation === MARGONEM_RELATION.FRIEND ||
    (relation !== MARGONEM_RELATION.NONE &&
      relation !== MARGONEM_RELATION.ENEMY &&
      Boolean(social.friends[characterId]));

  const isEnemy =
    relation === MARGONEM_RELATION.ENEMY ||
    (relation !== MARGONEM_RELATION.NONE &&
      relation !== MARGONEM_RELATION.FRIEND &&
      Boolean(social.enemies[characterId]));

  const friends = withCharacterFlag(social.friends, characterId, isFriend);
  const enemies = withCharacterFlag(social.enemies, characterId, isEnemy);

  return friends === social.friends && enemies === social.enemies
    ? social
    : Object.freeze({ enemies, friends });
};

const observeClan = (
  diplomacy: ClanDiplomacy,
  { clanId, relation }: PlayerRelationObservation,
): ClanDiplomacy => {
  if (clanId === undefined) return diplomacy;

  const key = String(clanId);

  if (relation === MARGONEM_RELATION.CLAN_ALLY)
    return withClanRelation(diplomacy, key, "ally");

  if (relation === MARGONEM_RELATION.CLAN_ENEMY)
    return withClanRelation(diplomacy, key, "enemy");

  if (relation === MARGONEM_RELATION.NONE)
    return withClanRelation(diplomacy, key, undefined);

  return diplomacy;
};

const decodePersistedSocialRelations = Schema.decodeUnknownOption(
  Schema.Struct({
    characters: Schema.Record(
      Schema.String,
      Schema.Struct({
        enemies: Schema.Record(Schema.String, Schema.Literal(true)).pipe(
          withFallback({}),
        ),
        friends: Schema.Record(Schema.String, Schema.Literal(true)).pipe(
          withFallback({}),
        ),
      }).pipe(withFallback(EMPTY_CHARACTER_SOCIAL)),
    ).pipe(withFallback({})),
    clans: Schema.Record(
      Schema.String,
      Schema.Record(Schema.String, Schema.Literals(["ally", "enemy"])).pipe(
        withFallback({}),
      ),
    ).pipe(withFallback({})),
  }),
);

/**
 * What the hero knows about other players. The game sends the friends and
 * enemies lists only while its society window is open, and clan diplomacy only
 * while the clan window shows it, so both are remembered per character and per
 * clan. Players met on the map carry the server's relation, which corrects the
 * remembered state as soon as it differs.
 */
export const useSocialRelationsStore = create<SocialRelationsState>()(
  persist(
    (set, get) => ({
      characters: {},
      clans: {},
      // The persist middleware writes storage after every set, even one that
      // keeps the state, so observations that confirm what is known skip it.
      observePlayers: (scopes, observations) => {
        const state = get();

        const currentSocial =
          state.characters[scopes.character] ?? EMPTY_CHARACTER_SOCIAL;

        const currentDiplomacy = scopes.clan
          ? (state.clans[scopes.clan] ?? EMPTY_CLAN_DIPLOMACY)
          : EMPTY_CLAN_DIPLOMACY;

        let social = currentSocial;
        let diplomacy = currentDiplomacy;

        for (const observation of observations) {
          social = observeCharacter(social, observation);

          if (scopes.clan) diplomacy = observeClan(diplomacy, observation);
        }

        if (social === currentSocial && diplomacy === currentDiplomacy) return;

        set({
          characters:
            social === currentSocial
              ? state.characters
              : { ...state.characters, [scopes.character]: social },
          clans:
            scopes.clan && diplomacy !== currentDiplomacy
              ? { ...state.clans, [scopes.clan]: diplomacy }
              : state.clans,
        });
      },
      replaceCharacterList: (characterScope, list, characterIds) =>
        set((state) => {
          const social =
            state.characters[characterScope] ?? EMPTY_CHARACTER_SOCIAL;

          return {
            characters: {
              ...state.characters,
              [characterScope]: Object.freeze({
                ...social,
                [list]: toCharacterIds(characterIds),
              }),
            },
          };
        }),
      replaceClanDiplomacy: (clanScope, relation, clanIds) =>
        set((state) => {
          const kept = Object.entries(
            state.clans[clanScope] ?? EMPTY_CLAN_DIPLOMACY,
          ).filter(([, current]) => current !== relation);

          return {
            clans: {
              ...state.clans,
              [clanScope]: Object.freeze(
                Object.fromEntries([
                  ...kept,
                  ...clanIds.flatMap((id) => (id ? [[id, relation]] : [])),
                ]),
              ),
            },
          };
        }),
    }),
    {
      name: storageKey("ll:social-relations:state"),
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        characters: state.characters,
        clans: state.clans,
      }),
      merge: (persisted, current) =>
        Option.match(decodePersistedSocialRelations(persisted), {
          onNone: () => current,
          onSome: (decoded) => ({ ...current, ...decoded }),
        }),
    },
  ),
);
