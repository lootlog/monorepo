import type { GameEvent, Item } from "@lootlog/margonem/game-events";
import type { LootSplitEvent } from "@lootlog/schema/loot-split";
import { describe, expect, it } from "vitest";
import {
  applyGameCommand,
  applyGameEvent,
  applyRemoteChoices,
  changedOwnSplits,
  CLOSED_SPLIT_LINGER_MS,
  EMPTY_LOOT_SPLIT_STATE,
  expireSplits,
  getLootSplitStatus,
  type LootSplitState,
} from "./loot-split-model";

// Shapes and values follow a group split recorded on luvia (Loot filter off).
const HERO = "220";

const item = (hid: string, name: string, reqp: string): Item => ({
  hid,
  name,
  icon: "zbr/zbroja1594.gif",
  stat: `lvl=279;rarity=common;reqp=${reqp}`,
  loc: "l",
  pr: 179_264,
  prc: "zl",
  st: 0,
  own: Number(HERO),
  cl: 8,
  tpl: 0,
});

const member = (nick: string, prof: string) => ({
  account: 1,
  nick,
  icon: "/clan/luvia_131m.gif",
  prof,
});

const FIRST_PARTY = {
  "100": member("nekoza", "h"),
  [HERO]: member("cashtelan", "p"),
  "365": member("Knoper S", "h"),
  "1466": member("Garberere", "b"),
};

const groupLoot = (
  items: Record<string, Item>,
  members: Record<string, ReturnType<typeof member>> = FIRST_PARTY,
): GameEvent => ({
  ev: 1_793_674_562.4,
  party: { members },
  item: items,
  loot: {
    init: Object.keys(members).length,
    endTs: 1_793_674_583,
    source: "fight",
    states: Object.fromEntries(Object.keys(items).map((id) => [id, 1])),
  },
});

const FIRST_ITEMS = {
  "1200653660": item("d835", "Szelki mutanta", "h"),
  "1200653658": item("274d", "Skromny pancerz piłowca", "b"),
};

const SECOND_ITEMS = { "1200660001": item("b0b1", "Hełm", "w") };

const context = (at = 0) => ({ at, heroId: HERO, party: [] });

const open = (
  state: LootSplitState = EMPTY_LOOT_SPLIT_STATE,
  event = groupLoot(FIRST_ITEMS),
  at = 0,
) => applyGameEvent(state, event, context(at));

const states = (values: Record<string, number>): GameEvent => ({
  loot: { source: "fight", states: values },
});

const remote = (
  sender: string,
  fields: Partial<LootSplitEvent> = {},
): LootSplitEvent => ({
  splitId: "1200653658",
  world: "luvia",
  sender: { characterId: sender, name: sender },
  choices: { "1200653658": 1, "1200653660": 2 },
  accepted: false,
  sentAt: 1,
  ...fields,
});

describe("loot split model", () => {
  it("ignores a solo loot, which has nobody to wait for", () => {
    const solo = groupLoot(FIRST_ITEMS, { [HERO]: member("cashtelan", "p") });

    expect(open(EMPTY_LOOT_SPLIT_STATE, solo)).toBe(EMPTY_LOOT_SPLIT_STATE);
  });

  it("opens a group split keyed by its smallest item id, with the party it fought with", () => {
    const state = open();
    const [split] = state.splits;

    expect(state.ownSplitId).toBe("1200653658");
    expect(split?.items.map(({ id }) => id)).toEqual([
      "1200653658",
      "1200653660",
    ]);
    expect(split?.participants.map(({ name }) => name)).toEqual([
      "nekoza",
      "cashtelan",
      "Knoper S",
      "Garberere",
    ]);
    // The split lasts until the server's `endTs`, not a client guess.
    expect(split?.deadline).toBeCloseTo(20_600, -1);
    expect(split?.views[HERO]?.choices).toEqual({
      "1200653658": 1,
      "1200653660": 1,
    });
  });

  it("shares a changed choice but not the states the game repeats with the accept answer", () => {
    const opened = open();

    const changed = applyGameEvent(
      opened,
      states({ "1200653658": 0, "1200653660": 1 }),
      context(),
    );

    expect(changedOwnSplits(opened, changed)).toHaveLength(1);

    const accepted = applyGameCommand(
      changed,
      "loot&want=1200653660&not=1200653658&must=&final=1",
    );

    const repeated = applyGameEvent(
      accepted,
      states({ "1200653658": 0, "1200653660": 1 }),
      context(),
    );

    expect(changedOwnSplits(changed, accepted)).toHaveLength(1);
    expect(repeated).toBe(accepted);
  });

  it("accepts only on the final loot command", () => {
    const opened = open();

    expect(
      applyGameCommand(opened, "loot&want=1200653658&not=&must=&final=0"),
    ).toBe(opened);
    expect(
      applyGameCommand(opened, "loot&want=1200653658&not=&must=&final=1")
        .splits[0]?.views[HERO]?.accepted,
    ).toBe(true);
  });

  it("keeps the first split open for a participant who was left out when the leader regrouped", () => {
    const first = applyGameCommand(
      open(),
      "loot&want=1200653658,1200653660&not=&must=&final=1",
    );

    const regrouped = {
      [HERO]: member("cashtelan", "p"),
      "365": member("Knoper S", "h"),
    };

    const second = open(first, groupLoot(SECOND_ITEMS, regrouped), 5_000);

    // nekoza is no longer in the party but still holds up the first split.
    const withSlowpoke = applyRemoteChoices(second, remote("100"));

    const firstSplit = withSlowpoke.splits.find(
      ({ id }) => id === "1200653658",
    );

    expect(withSlowpoke.splits).toHaveLength(2);
    expect(withSlowpoke.ownSplitId).toBe("1200660001");
    expect(firstSplit && getLootSplitStatus(firstSplit, "100", HERO)).toBe(
      "choosing",
    );
    expect(
      applyRemoteChoices(
        withSlowpoke,
        remote("100", { splitId: "1200660001" }),
      ),
    ).toBe(withSlowpoke);
  });

  it("counts the hero's window closed by a new fight as accepted", () => {
    const second = open(open(), groupLoot(SECOND_ITEMS), 3_000);
    const first = second.splits.find(({ id }) => id === "1200653658");

    expect(first?.views[HERO]).toMatchObject({
      accepted: true,
      inferred: true,
    });
    expect(changedOwnSplits(open(), second).map(({ id }) => id)).toEqual([
      "1200653658",
      "1200660001",
    ]);
  });

  it("resolves only the split whose items the distribution message quotes", () => {
    const both = open(open(), groupLoot(SECOND_ITEMS), 3_000);

    const resolved = applyGameEvent(
      both,
      {
        chat: {
          channels: {
            system: {
              archivedIds: [],
              msg: [
                {
                  id: 1,
                  ts: 1,
                  msg: '[b]Podział łupów[/b]: Knoper S otrzymał ITEM#b0b1:"Hełm"',
                },
              ],
            },
          },
        },
      },
      context(4_000),
    );

    expect(resolved.splits.map(({ id, phase }) => [id, phase])).toEqual([
      ["1200653658", "open"],
      ["1200660001", "resolved"],
    ]);
  });

  it("ignores choices from a character outside the split", () => {
    const opened = open();

    expect(applyRemoteChoices(opened, remote("999"))).toBe(opened);
  });

  it("marks players without Lootlog as unknown instead of choosing", () => {
    const [split] = applyRemoteChoices(open(), remote("365")).splits;

    expect(split && getLootSplitStatus(split, "365", HERO)).toBe("choosing");
    expect(split && getLootSplitStatus(split, "1466", HERO)).toBe("unknown");
  });

  it("expires a split at its deadline and drops it after it was readable", () => {
    const opened = open();
    const deadline = opened.splits[0]?.deadline ?? 0;
    const expired = expireSplits(opened, deadline);

    expect(expired.splits[0]?.phase).toBe("expired");
    expect(
      expireSplits(expired, deadline + CLOSED_SPLIT_LINGER_MS).splits,
    ).toEqual([]);
  });
});
