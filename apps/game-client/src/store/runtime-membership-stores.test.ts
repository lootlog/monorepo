import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFriendsStore } from "./friends.store";
import { usePartyStore } from "./party.store";

describe("runtime membership stores", () => {
  beforeEach(() => {
    useFriendsStore.getState().clearFriends();
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
    const subscriber = vi.fn();
    const unsubscribe = usePartyStore.subscribe(subscriber);

    usePartyStore.getState().replaceParty([{ ...members[0] }]);

    expect(usePartyStore.getState().members).toBe(currentMembers);
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish a semantically identical friends list", () => {
    const friends = [
      {
        characterId: "2",
        icon: "friend.gif",
        level: 300,
        location: "Map",
        name: "Friend",
        profession: "m",
        status: "online",
      },
    ] as const;
    useFriendsStore.getState().replaceFriends(friends, 25);
    const currentFriends = useFriendsStore.getState().friends;
    const subscriber = vi.fn();
    const unsubscribe = useFriendsStore.subscribe(subscriber);

    useFriendsStore.getState().replaceFriends([{ ...friends[0] }], 25);

    expect(useFriendsStore.getState().friends).toBe(currentFriends);
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });
});
