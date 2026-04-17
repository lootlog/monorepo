import { beforeEach, describe, expect, it } from "vitest";
import { useFriendsStore } from "@/store/friends.store";
import { FriendsProcessor } from "./friends-processor";

describe("FriendsProcessor", () => {
  let processor: FriendsProcessor;

  beforeEach(() => {
    processor = new FriendsProcessor();
    useFriendsStore.setState({
      friends: [],
      friendsMax: 0,
    });
  });

  it("ignores events without friends data", () => {
    processor.handle({});

    expect(useFriendsStore.getState().friends).toEqual([]);
    expect(useFriendsStore.getState().friendsMax).toBe(0);
  });

  it("parses friends list from event payload", () => {
    processor.handle({
      friends: [
        "101",
        "Tester",
        "icon.gif",
        "120",
        "0",
        "w",
        "Ithan",
        "1",
        "2",
        "online",
        "x",
      ],
    });

    expect(useFriendsStore.getState().friends).toEqual([
      {
        characterId: "101",
        nick: "Tester",
        icon: "icon.gif",
        lvl: "120",
        opLvl: "0",
        prof: "w",
        location: "Ithan",
        x: "1",
        y: "2",
        status: "online",
        unknown1: "x",
      },
    ]);
  });

  it("updates friends max separately from friends list", () => {
    processor.handle({
      friends_max: 50,
    });

    expect(useFriendsStore.getState().friendsMax).toBe(50);
  });
});
