import { resolvePlayerRelations } from "@/lib/player-relation";
import { useGameStore } from "@/store/game.store";
import { usePartyStore } from "@/store/party.store";
import {
  getSocialScopes,
  useSocialRelationsStore,
} from "@/store/social-relations.store";

type RelatedPlayer = {
  characterId: string;
  clanId?: number;
  /** Falls back to the nick for a presence whose character id is unknown. */
  name?: string;
};

/** How the active hero relates to another player, most telling first. */
export const usePlayerRelations = ({
  characterId,
  clanId,
  name,
}: RelatedPlayer) => {
  const world = useGameStore((state) => state.game?.world);
  const heroAccountId = useGameStore((state) => state.game?.hero.accountId);
  const heroCharacterId = useGameStore((state) => state.game?.hero.characterId);
  const heroName = useGameStore((state) => state.game?.hero.name);
  const heroClanId = useGameStore((state) => state.game?.hero.clan?.id);

  const scopes = getSocialScopes({
    accountId: heroAccountId,
    characterId: heroCharacterId,
    clanId: heroClanId,
    world,
  });

  const isPartyMember = usePartyStore(
    (state) =>
      Boolean(characterId) &&
      state.members.some((member) => member.characterId === characterId),
  );

  const isFriend = useSocialRelationsStore((state) =>
    Boolean(scopes && state.characters[scopes.character]?.friends[characterId]),
  );

  const isEnemy = useSocialRelationsStore((state) =>
    Boolean(scopes && state.characters[scopes.character]?.enemies[characterId]),
  );

  const clanRelation = useSocialRelationsStore((state) =>
    scopes?.clan && clanId !== undefined
      ? state.clans[scopes.clan]?.[String(clanId)]
      : undefined,
  );

  return resolvePlayerRelations({
    clanRelation,
    isEnemy,
    isFriend,
    isPartyMember,
    isSameClan: clanId !== undefined && clanId === heroClanId,
    isSelf:
      (Boolean(characterId) && characterId === heroCharacterId) ||
      (Boolean(name) && name === heroName),
  });
};
