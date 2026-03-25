import { describe, bench } from "vitest";
import { msgpackParser, encode, decode } from "./index";

describe("MsgpackEncoder", () => {
  const encoder = new msgpackParser.Encoder();

  const smallPacket = {
    type: 2,
    nsp: "/",
    data: ["event", { message: "hello" }],
  };

  const largePacket = {
    type: 2,
    nsp: "/battle",
    data: [
      "battle:update",
      {
        warriors: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Warrior${i}`,
          hp: 100 - i * 3,
          team: i % 2,
          damage: Math.floor(Math.random() * 1000),
          stats: { str: 100, dex: 80, int: 60, con: 90 },
        })),
        timestamp: Date.now(),
        round: 15,
      },
    ],
  };

  bench("encode - small packet", () => {
    encoder.encode(smallPacket);
  });

  bench("encode - large packet (20 warriors)", () => {
    encoder.encode(largePacket);
  });
});

describe("MsgpackDecoder", () => {
  const encoder = new msgpackParser.Encoder();

  const packet = {
    type: 2,
    nsp: "/",
    data: ["event", { message: "hello", count: 42 }],
  };

  const encoded = encoder.encode(packet)[0];

  bench("decode - small packet", () => {
    const decoder = new msgpackParser.Decoder();
    decoder.on("decoded", () => {});
    decoder.add(encoded);
    decoder.destroy();
  });
});

describe("Raw msgpack encode/decode", () => {
  const data = {
    warriors: Array.from({ length: 10 }, (_, i) => ({
      id: i,
      name: `Warrior${i}`,
      hp: 100,
      team: i % 2,
    })),
  };

  const packed = encode(data);

  bench("encode - object with array", () => {
    encode(data);
  });

  bench("decode - object with array", () => {
    decode(packed);
  });
});
