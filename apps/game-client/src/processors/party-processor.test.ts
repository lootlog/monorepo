import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyStore } from "@/store/party.store";
import { PartyProcessor } from "./party-processor";

describe("PartyProcessor", () => {
  let processor: PartyProcessor;

  beforeEach(() => {
    vi.restoreAllMocks();
    processor = new PartyProcessor();
    usePartyStore.setState({
      members: [],
    });
    Reflect.deleteProperty(window, "Engine");
  });

  it("ignores events without party data", () => {
    processor.handle({});

    expect(usePartyStore.getState().members).toEqual([]);
  });

  it("clears party when event members are empty", () => {
    usePartyStore.setState({
      members: [
        {
          id: 1,
          nick: "Existing",
          icon: "icon.gif",
          leader: false,
          hp: [10, 10],
          profession: "w",
          accountId: 10,
        },
      ],
    });

    processor.handle({
      party: {
        members: {},
      },
    });

    expect(usePartyStore.getState().members).toEqual([]);
  });

  it("maps party members from event payload", () => {
    processor.handle({
      party: {
        members: {
          "1": {
            id: 1,
            nick: "Leader",
            icon: "leader.gif",
            commander: 1,
            account: 101,
          },
          "2": {
            id: 2,
            nick: "Member",
            icon: "member.gif",
            account: 102,
          },
        },
      },
    });

    expect(usePartyStore.getState().members).toEqual([
      {
        id: 1,
        nick: "Leader",
        icon: "leader.gif",
        leader: true,
        hp: [0, 0],
        profession: null,
        accountId: 101,
      },
      {
        id: 2,
        nick: "Member",
        icon: "member.gif",
        leader: false,
        hp: [0, 0],
        profession: null,
        accountId: 102,
      },
    ]);
  });

  it("loads initial party members from Engine", () => {
    window.Engine = {
      party: {
        getMembers: () =>
          new Map([
            [
              1,
              {
                id: 1,
                nick: "Leader",
                icon: "leader.gif",
                leader: true,
                hp: [80, 100],
                profession: "w",
                accountId: 101,
              },
            ],
          ]),
      },
    } as never;

    processor.handleInitialDetection();

    expect(usePartyStore.getState().members).toEqual([
      {
        id: 1,
        nick: "Leader",
        icon: "leader.gif",
        leader: true,
        hp: [80, 100],
        profession: "w",
        accountId: 101,
      },
    ]);
  });

  it("clears party when initial detection returns empty map", () => {
    usePartyStore.setState({
      members: [
        {
          id: 1,
          nick: "Existing",
          icon: "icon.gif",
          leader: false,
          hp: [10, 10],
          profession: "w",
          accountId: 10,
        },
      ],
    });

    window.Engine = {
      party: {
        getMembers: () => new Map(),
      },
    } as never;

    processor.handleInitialDetection();

    expect(usePartyStore.getState().members).toEqual([]);
  });

  it("logs warning when initial detection throws", () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    window.Engine = {
      party: {
        getMembers: () => {
          throw new Error("boom");
        },
      },
    } as never;

    processor.handleInitialDetection();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to get initial party members:",
      expect.any(Error),
    );
  });
});
