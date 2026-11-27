import { describe, expect, test } from "bun:test";
import { createGameFactExtractor } from "./extractor.js";
import { decodeGamePacket } from "./packets.js";

const observedAt = "2026-11-25T05:00:00.000Z";

const enterMap = {
  town: {
    id: 1141,
    mainid: 1141,
    name: "Trupia Przełęcz",
    file: "trupia-przelecz.5.png",
    bg: "011.jpg",
    pvp: 1,
    params: { respawn: "Liściaste Rozstaje" },
  },
  townname: { "1901": "Niecka Xiuh Atl" },
  gw2: [1901, 0, 53, 0, 65536200, 1153, 9, 21, 1, 0],
  icons: [{ id: 140, icon: "/obrazki/npc/mas/zakonnik.gif" }],
  npc_tpls: [
    { id: 44176, nick: "Zakonnik", type: 0, level: 50 },
    { id: 75536, nick: "choinka", type: 4 },
    { id: 9000, nick: "Wilk", type: 2, level: 300, elasticLevelFactor: 1 },
  ],
  npcs: [
    { id: 501, tpl: 44176, x: 51, y: 33, icon: { id: 140 } },
    { id: 502, tpl: 75536, x: 1, y: 1, icon: { id: 1 } },
  ],
  other: { "232770": { nick: "Wilfred", account: 1 } },
  chat: { channels: {} },
};

const extract = (...packets: Array<[unknown, string?]>) => {
  const extractor = createGameFactExtractor();

  for (const [packet, request] of packets) {
    extractor.observe(decodeGamePacket(packet), { request, observedAt });
  }

  return {
    facts: extractor.facts().map(({ fact }) => fact),
    coverage: extractor.coverage(),
  };
};

describe("createGameFactExtractor", () => {
  test("reads a map, its gateways with decoded levels and its NPCs, without players or decorations", () => {
    const { facts, coverage } = extract([enterMap]);

    expect(facts).toContainEqual(
      expect.objectContaining({
        kind: "MAP",
        mapId: 1141,
        respawnMapName: "Liściaste Rozstaje",
      }),
    );
    expect(facts.filter(({ kind }) => kind === "GATEWAY")).toEqual([
      {
        kind: "GATEWAY",
        fromMapId: 1141,
        toMapId: 1901,
        toMapName: "Niecka Xiuh Atl",
        x: 0,
        y: 53,
        requiresKey: false,
        minLevel: 200,
        maxLevel: null,
      },
      {
        kind: "GATEWAY",
        fromMapId: 1141,
        toMapId: 1153,
        toMapName: null,
        x: 9,
        y: 21,
        requiresKey: true,
        minLevel: null,
        maxLevel: null,
      },
    ]);
    expect(facts.filter(({ kind }) => kind === "NPC_PLACEMENT")).toEqual([
      {
        kind: "NPC_PLACEMENT",
        mapId: 1141,
        npcId: 44176,
        x: 51,
        y: 33,
        icon: "mas/zakonnik.gif",
      },
    ]);
    expect(facts).toContainEqual(
      expect.objectContaining({
        kind: "NPC",
        npcId: 9000,
        level: null,
        elastic: true,
      }),
    );
    expect(
      facts.some((fact) => fact.kind === "NPC" && fact.npcId === 75536),
    ).toBe(false);
    expect(JSON.stringify(facts)).not.toContain("Wilfred");
    expect(coverage.ignored).toMatchObject({ other: 1, chat: 1 });
  });

  test("links dialog steps through the chosen options to the next step, a shop and a teleport", () => {
    const { facts } = extract(
      [enterMap],
      [
        {
          d: [
            "0",
            "Zakonnik",
            "501",
            "1",
            "Witaj [SEX=przybyszu|przybyszko].",
            "",
            "2",
            "Teleport",
            "20.1",
            "34",
            "Sklep",
            "20.2",
            "6",
            "Nic",
            "20.7",
          ],
        },
        "t=talk&id=501",
      ],
      [
        {
          d: ["0", "Zakonnik", "501", "1", "Na pewno?", "", "2", "Tak", "23.1"],
        },
        "t=talk&id=501&c=20.1",
      ],
      [{ d: ["4", "", ""], t: "reload" }, "t=talk&id=501&c=23.1"],
      [
        { town: { id: 1, name: "Ithan", file: "ithan.8.png" } },
        "t=init&initlvl=2",
      ],
    );

    expect(facts).toContainEqual({
      kind: "DIALOG_NODE",
      npcId: 44176,
      nodeId: "20",
      speaker: "Zakonnik",
      text: "Witaj [SEX=przybyszu|przybyszko].",
      options: [
        { optionId: "20.1", text: "Teleport", flags: 2 },
        { optionId: "20.2", text: "Sklep", flags: 34 },
        { optionId: "20.7", text: "Nic", flags: 6 },
      ],
    });
    expect(facts.filter(({ kind }) => kind === "DIALOG_TRANSITION")).toEqual([
      {
        kind: "DIALOG_TRANSITION",
        npcId: 44176,
        optionId: "20.1",
        nextNodeId: "23",
        shopId: null,
        teleportMapId: null,
      },
      {
        kind: "DIALOG_TRANSITION",
        npcId: 44176,
        optionId: "23.1",
        nextNodeId: null,
        shopId: null,
        teleportMapId: 1,
      },
    ]);

    const shop = extract(
      [enterMap],
      [
        {
          d: ["4", "", ""],
          shop: {
            id: 1046,
            cur: "zl",
            buyp: 75,
            items_offers: [{ tplId: 33610, price: 15044, quantity: 1 }],
          },
          item_tpl: {
            "33610": {
              id: 33610,
              name: "Osłona",
              icon: "hel/helm705.gif",
              cl: 9,
              stat: "lvl=55",
              pr: 10029,
              prc: "zl",
            },
          },
        },
        "t=talk&id=501&c=20.2",
      ],
    ).facts;

    expect(shop).toContainEqual({
      kind: "SHOP",
      shopId: 1046,
      npcId: 44176,
      currency: "zl",
      buyBackPercent: 75,
      offers: [{ itemId: 33610, price: 15044, quantity: 1 }],
    });
    expect(shop).toContainEqual(
      expect.objectContaining({
        kind: "DIALOG_TRANSITION",
        optionId: "20.2",
        shopId: 1046,
      }),
    );
    expect(shop).toContainEqual(
      expect.objectContaining({ kind: "ITEM", itemId: 33610, name: "Osłona" }),
    );
  });

  test("credits fight loot to the fought NPC templates and keeps one statistics fact per template", () => {
    const { facts } = extract(
      [
        {
          ...enterMap,
          npc_tpls: [{ id: 77096, nick: "Yaotlakatl", type: 2, level: 252 }],
          npcs: [
            { id: 221265, tpl: 77096, x: 5, y: 5, icon: { id: 140 } },
            { id: 221266, tpl: 77096, x: 6, y: 5, icon: { id: 140 } },
          ],
        },
      ],
      [
        {
          f: {
            init: "1",
            w: {
              "11270": { npc: 0, name: "Gracz", hp: { max: 1 } },
              "-221265": {
                npc: 1,
                originalId: 221265,
                name: "Yaotlakatl",
                lvl: 252,
                prof: "w",
                wt: 0,
                icon: "hum/mahoptek3-a.gif",
                hp: { max: 29494 },
                ac: { cur: 3851 },
                act: { cur: 30 },
              },
              "-221266": {
                npc: 1,
                originalId: 221266,
                name: "Yaotlakatl",
                lvl: 252,
                prof: "w",
                wt: 0,
                icon: "hum/mahoptek3-b.gif",
                hp: { max: 29494 },
                ac: { cur: 3851 },
                act: { cur: 30 },
              },
            },
          },
          loot: { source: "fight", states: { "1564905232": 1 } },
          item: {
            "1564905232": {
              hid: "secret",
              own: 11270,
              tpl: 60137,
              name: "Gliniana tarcza",
              icon: "tar/tarcza706.gif",
              cl: 14,
              pr: 166919,
              prc: "zl",
              loc: "l",
              stat: "lvl=251",
            },
          },
        },
      ],
    );

    expect(facts.filter(({ kind }) => kind === "MONSTER_STATS")).toHaveLength(
      1,
    );
    expect(facts).toContainEqual(
      expect.objectContaining({
        kind: "MONSTER_STATS",
        npcId: 77096,
        hp: 29494,
        armor: 3851,
        poisonResistance: 30,
      }),
    );
    expect(facts).toContainEqual({
      kind: "DROP",
      itemId: 60137,
      npcIds: [77096],
    });
    expect(JSON.stringify(facts)).not.toContain("secret");
    expect(JSON.stringify(facts)).not.toContain("Gracz");
  });

  test("reports unknown packet keys and keeps reading a packet with one malformed key", () => {
    const { facts, coverage } = extract([
      { ...enterMap, npcs: "broken", questsData: [] },
    ]);

    expect(coverage.unknown).toEqual({ questsData: 1 });
    expect(coverage.skipped).toEqual({ PACKET_MALFORMED: 1 });
    expect(facts).toContainEqual(
      expect.objectContaining({ kind: "MAP", mapId: 1141 }),
    );
  });
});
