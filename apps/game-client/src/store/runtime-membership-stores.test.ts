import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyStore } from "./party.store";
import {
  MARGONEM_RELATION,
  useSocialRelationsStore,
} from "./social-relations.store";

describe("runtime membership stores", () => {
  beforeEach(() => {
    useSocialRelationsStore.setState({ characters: {}, clans: {} });
    usePartyStore.getState().clearParty();
  });

  it("does not publish a semantically identical party", () => {
    const members = [
      {
        accountId: "1",
        characterId: "2",
        currentHp: 100,
        icon: "hero.gif",
        isLeader: true,
        maxHp: 100,
        name: "Hero",
        profession: "w",
      },
    ] as const;

    usePartyStore.getState().replaceParty(members);
    const currentMembers = usePartyStore.getState().members;
    const subscriber = vi.fn<Parameters<typeof usePartyStore.subscribe>[0]>();
    const unsubscribe = usePartyStore.subscribe(subscriber);

    usePartyStore.getState().replaceParty([{ ...members[0] }]);

    expect(usePartyStore.getState().members).toBe(currentMembers);
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish when players met on the map confirm known relations", () => {
    const scopes = { character: "hero", clan: "hero-clan" };

    const observations = [
      { characterId: "2", relation: MARGONEM_RELATION.FRIEND },
      { characterId: "3", clanId: 7, relation: MARGONEM_RELATION.CLAN_ALLY },
    ];

    useSocialRelationsStore.getState().observePlayers(scopes, observations);

    const subscriber =
      vi.fn<Parameters<typeof useSocialRelationsStore.subscribe>[0]>();

    const unsubscribe = useSocialRelationsStore.subscribe(subscriber);

    useSocialRelationsStore.getState().observePlayers(scopes, observations);

    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });
});
