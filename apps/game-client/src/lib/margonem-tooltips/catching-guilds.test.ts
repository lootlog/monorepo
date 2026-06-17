import { beforeEach, describe, expect, it } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { appendCatchingGuildsTooltipSection } from "./catching-guilds";

const createOther = (): Other =>
  ({
    d: {
      account: 9822301,
      icon: "other.gif",
      id: "617",
      lvl: 300,
      nick: "Other",
      prof: "w",
    },
  }) as Other;

function setOnlineOwner(guildMemberName?: string): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse(
    {
      "player-discord": [
        {
          discordId: "player-discord",
          isAfk: false,
          player: {
            accountId: "9822301",
            characterId: "617",
            icon: "other.gif",
            lvl: 300,
            name: "Other",
            prof: "w",
            world: "tempest",
          },
        },
      ],
    },
    guildMemberName
      ? {
          "player-discord": {
            avatar: null,
            color: null,
            id: 1,
            name: guildMemberName,
            userId: "player-discord",
          },
        }
      : undefined,
  );
}

describe("appendCatchingGuildsTooltipSection", () => {
  beforeEach(() => {
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
  });

  it("does not extend non-other tooltips", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Hero</div>",
        character: {},
        currentHtml: "<div>Hero</div>",
        kind: "hero",
      }),
    ).toBe("<div>Hero</div>");
  });

  it("does not extend other tooltips while shift is not pressed", () => {
    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toBe("<div>Other</div>");
  });

  it("shows unavailable state before a cache entry exists", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    setOnlineOwner();

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Brak informacji o graczu online");
  });

  it("shows loading state when the cache entry is loading", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    setOnlineOwner();
    store.setLoading("player-discord:9822301:617");

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Ładowanie...");
  });

  it("shows escaped guild names for successful entries", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    setOnlineOwner("Member <One>");
    store.setSuccess("player-discord:9822301:617", [
      { id: "guild-1", name: "Alpha <One>" },
      { id: "guild-2", name: "Beta & Co" },
    ]);

    const result = appendCatchingGuildsTooltipSection({
      baseHtml: "<div>Other</div>",
      character: createOther(),
      currentHtml: "<div>Other</div>",
      kind: "other",
    });

    expect(result).toContain("Dodaje łupy i timery na:");
    expect(result).toContain("Gra jako:");
    expect(result).toContain("Member &lt;One&gt;");
    expect(result).toContain("Alpha &lt;One&gt;");
    expect(result).toContain("Beta &amp; Co");
  });

  it("shows an empty state for successful entries without guilds", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    setOnlineOwner();
    store.setSuccess("player-discord:9822301:617", []);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Brak wspólnych serwerów Lootloga");
  });

  it("shows unavailable state while shift is pressed when the owner is missing", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: { d: {} } as Other,
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Brak informacji o graczu online");
  });

  it("shows an error state", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    setOnlineOwner();
    store.setError("player-discord:9822301:617");

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Nie udało się pobrać serwerów");
  });
});
