import { expect, test } from "bun:test";
import { REALTIME_INBOUND_TIMEOUT_CLOSE_CODE } from "@lootlog/protocol/realtime";
import {
  INBOUND_PROBE_INTERVAL_MS,
  INBOUND_SILENCE_LIMIT_MS,
  InboundLiveness,
  type LivenessSocket,
} from "./inbound-liveness.js";

const setup = () => {
  let now = 0;
  const liveness = new InboundLiveness(() => now);

  const connect = (answersPings: boolean) => {
    const closes: Array<number | undefined> = [];

    const socket: LivenessSocket = {
      ping: () => {
        if (answersPings) liveness.inbound(socket);

        return 0;
      },
      close: (code) => {
        closes.push(code);
        liveness.close(socket);
      },
    };

    liveness.inbound(socket);

    return closes;
  };

  const advance = (milliseconds: number) => {
    for (
      let elapsed = 0;
      elapsed < milliseconds;
      elapsed += INBOUND_PROBE_INTERVAL_MS
    ) {
      now += INBOUND_PROBE_INTERVAL_MS;
      liveness.sweep();
    }
  };

  return { connect, advance };
};

test("closes a peer that vanished without closing, and keeps one that only answers pings", () => {
  const { connect, advance } = setup();
  const vanished = connect(false);
  const quietButAlive = connect(true);

  advance(INBOUND_SILENCE_LIMIT_MS - INBOUND_PROBE_INTERVAL_MS);
  expect(vanished).toEqual([]);

  advance(10 * INBOUND_SILENCE_LIMIT_MS);
  expect(vanished).toEqual([REALTIME_INBOUND_TIMEOUT_CLOSE_CODE]);
  expect(quietButAlive).toEqual([]);
});
