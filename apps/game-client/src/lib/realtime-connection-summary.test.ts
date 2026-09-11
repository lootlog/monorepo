import { describe, expect, it } from "vitest";
import { summarizeRealtimeConnection } from "./realtime-connection-summary";

describe("summarizeRealtimeConnection", () => {
  it("reports connected only once at least one Lootlog room is joined", () => {
    expect(
      summarizeRealtimeConnection({
        connected: true,
        joined: true,
        joinedGuilds: ["g1"],
      }),
    ).toBe("connected");
    expect(
      summarizeRealtimeConnection({
        connected: true,
        joined: true,
        joinedGuilds: [],
      }),
    ).toBe("joining");
    expect(
      summarizeRealtimeConnection({
        connected: true,
        joined: false,
        joinedGuilds: [],
      }),
    ).toBe("joining");
    expect(
      summarizeRealtimeConnection({
        connected: false,
        joined: true,
        joinedGuilds: ["g1"],
      }),
    ).toBe("disconnected");
  });
});
