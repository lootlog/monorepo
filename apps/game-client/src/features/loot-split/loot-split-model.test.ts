import type { GameEvent, Item } from "@lootlog/margonem/game-events";
import type { LootSplitEvent } from "@lootlog/schema/loot-split";
import { describe, expect, it } from "vitest";
import {
  applyGameCommand,
  applyGameEvent,
  applyRemoteChoices,
  applyRemoteFilterAccept,
  changedOwnSplits,
  CLOSED_SPLIT_LINGER_MS,
  EMPTY_LOOT_SPLIT_STATE,
  expireSplits,
  getLootSplitStatus,
  ownLootFilterAcceptRecipients,
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

const context = (at = 0, fighters: readonly string[] = []) => ({
  at,
  heroId: HERO,
  party: [],
  fighters: new Set(fighters),
});

const open = (
  state: LootSplitState = EMPTY_LOOT_SPLIT_STATE,
  event = groupLoot(FIRST_ITEMS),
  at = 0,
) => applyGameEvent(state, event, context(at));

const states = (values: Record<string, number>): GameEvent => ({
  loot: { source: "fight", states: values },
});

const distribution = (message: string): GameEvent => ({
  chat: {
    channels: {
      system: { archivedIds: [], msg: [{ id: 1, ts: 1, msg: message }] },
    },
  },
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

    expect(open(EMPTY_LOOT_SPLIT_STATE, solo).splits).toEqual([]);
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

  it("shares a changed choice but not the states the game repeats", () => {
    const opened = open();
    const choice = states({ "1200653658": 0, "1200653660": 1 });
    const changed = applyGameEvent(opened, choice, context());

    expect(changedOwnSplits(opened, changed)).toHaveLength(1);
    expect(applyGameEvent(changed, choice, context())).toBe(changed);
  });

  it("counts an accept only once the server answers it without refusing", () => {
    const opened = open();
    const command = "loot&want=1200653658,1200653660&not=&must=&final=1";
    const requested = applyGameCommand(opened, command);
    const answer = states({ "1200653658": 1, "1200653660": 1 });

    // Changing a choice is not an accept.
    expect(
      applyGameCommand(opened, "loot&want=1200653658&not=&must=&final=0"),
    ).toBe(opened);
    expect(requested.splits[0]?.views[HERO]?.accepted).toBe(false);
    expect(
      applyGameEvent(requested, answer, context()).splits[0]?.views[HERO]
        ?.accepted,
    ).toBe(true);
    // NI keeps the loot window open when the answer carries `w`.
    expect(
      applyGameEvent(requested, Object.assign({ w: 1 }, answer), context())
        .splits[0]?.views[HERO]?.accepted,
    ).toBe(false);
  });

  it("takes the choices of an SI refuse-all accept from the request itself", () => {
    const requested = applyGameCommand(
      open(),
      "loot&not=1200653658,1200653660&final=1",
    );

    expect(requested.splits[0]?.views[HERO]?.choices).toEqual({
      "1200653658": 0,
      "1200653660": 0,
    });
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

  it("counts the hero's window closed by a fight without loot as accepted", () => {
    const fought = applyGameEvent(open(), { f: { init: "1" } }, context(3_000));

    expect(fought.ownSplitId).toBeNull();
    expect(fought.splits[0]?.views[HERO]).toMatchObject({
      accepted: true,
      autoAccept: "newFight",
    });
  });

  it("keeps a solo loot's choices out of the group split it closed", () => {
    const solo = groupLoot(SECOND_ITEMS, { [HERO]: member("cashtelan", "p") });
    const afterSolo = open(open(), solo, 3_000);

    const soloChoice = applyGameEvent(
      afterSolo,
      states({ "1200660001": 0 }),
      context(3_500),
    );

    expect(soloChoice).toBe(afterSolo);
    expect(afterSolo.splits[0]?.views[HERO]?.accepted).toBe(true);
  });

  it("leaves party members who stayed out of the fight out of the split", () => {
    const state = applyGameEvent(
      EMPTY_LOOT_SPLIT_STATE,
      groupLoot(FIRST_ITEMS),
      context(0, ["100", "365"]),
    );

    expect(state.splits[0]?.participants.map(({ name }) => name)).toEqual([
      "nekoza",
      "cashtelan",
      "Knoper S",
    ]);
  });

  it("counts the hero's window closed by a new fight as accepted", () => {
    const second = open(open(), groupLoot(SECOND_ITEMS), 3_000);
    const first = second.splits.find(({ id }) => id === "1200653658");

    expect(first?.views[HERO]).toMatchObject({
      accepted: true,
      autoAccept: "newFight",
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
      distribution('[b]Podział łupów[/b]: Knoper S otrzymał ITEM#b0b1:"Hełm"'),
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

  it("reports a participant who had not accepted when the time ran out as timed out, not choosing", () => {
    const opened = applyRemoteChoices(open(), remote("365"));

    const [split] = expireSplits(
      opened,
      opened.splits[0]?.deadline ?? 0,
    ).splits;

    expect(split && getLootSplitStatus(split, "365", HERO)).toBe("timedOut");
    expect(split && getLootSplitStatus(split, HERO, HERO)).toBe("timedOut");
    expect(split && getLootSplitStatus(split, "1466", HERO)).toBe("unknown");
  });

  it("keeps a split distributed after its deadline timed out, not choosing", () => {
    const opened = applyRemoteChoices(open(), remote("365"));

    // The game distributes at the deadline, which can beat the expiry tick.
    const [split] = applyGameEvent(
      opened,
      distribution(
        '[b]Podział łupów[/b]: Knoper S otrzymał ITEM#d835:"Szelki"',
      ),
      context(opened.splits[0]?.deadline ?? 0),
    ).splits;

    expect(split && getLootSplitStatus(split, "365", HERO)).toBe("timedOut");
  });
});

// A group fight recorded on luvia with the hero's loot filter accepting group
// loot from fights: the drop reaches this client only through the battle log.
const warrior = (id: number, name: string) => ({
  id,
  originalId: id,
  name,
  lvl: 303,
  prof: "p",
  hpp: 100,
  icon: "/clan/luvia_131m.gif",
  team: id > 0 ? 1 : 2,
  wt: 0,
  type: 0,
});

const filteredFight = (lastLine: string): GameEvent => ({
  f: {
    init: "1",
    auto: "1",
    endBattle: 1,
    w: {
      [HERO]: warrior(220, "cashtelan"),
      "16051": warrior(16051, "definitely not safe"),
      "-115101": warrior(-115101, "Sługa piasków"),
    },
    m: [
      "0;0;winner=cashtelan, definitely not safe",
      "0;0;loser=Sługa piasków, Smokoszczęki, Czciciel Charkhaam",
      "0;0;+exp=3682",
      lastLine,
    ],
  },
});

describe("loot filter accepts", () => {
  it("tells the fight's other players when the hero's loot filter took the drop", () => {
    expect(
      ownLootFilterAcceptRecipients(
        filteredFight(
          "0;0;txt=Sługa piasków: zdobyto Przepaska zaklinacza sępów",
        ),
        context(),
      ),
    ).toEqual(["16051"]);
  });

  it("stays quiet after a fight without a drop or with a loot window", () => {
    expect(
      ownLootFilterAcceptRecipients(filteredFight("0;0;+exp=3682"), context()),
    ).toBeNull();
    expect(
      ownLootFilterAcceptRecipients(
        {
          ...filteredFight(
            "0;0;txt=Nymphemonia: zdobyto Plecionka z leśnych kwiatów",
          ),
          ...groupLoot(FIRST_ITEMS),
        },
        context(),
      ),
    ).toBeNull();
  });

  it("marks a participant accepted by their loot filter, even before their split opens here", () => {
    const opened = applyRemoteFilterAccept(open(), "365", 1_000);

    expect(opened.splits[0]?.views["365"]).toMatchObject({
      accepted: true,
      autoAccept: "lootFilter",
    });

    // The sender's client heard of the fight a poll earlier than this one.
    const early = open(
      applyRemoteFilterAccept(EMPTY_LOOT_SPLIT_STATE, "365", 0),
      undefined,
      200,
    );

    expect(early.splits[0]?.views["365"]?.autoAccept).toBe("lootFilter");
    expect(early.pendingFilterAccepts).toEqual([]);

    // A stale accept belongs to an earlier fight.
    const stale = open(
      applyRemoteFilterAccept(EMPTY_LOOT_SPLIT_STATE, "365", 0),
      undefined,
      6_000,
    );

    expect(stale.splits[0]?.views["365"]).toBeUndefined();
  });
});
