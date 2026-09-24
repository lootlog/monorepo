import { describe, expect, it } from "vitest";
import { resolveRealtimeConnectionStatus } from "./realtime-connection-status";

describe("resolveRealtimeConnectionStatus", () => {
  it("reports a first connection as connecting, not as a lost connection", () => {
    for (const state of [
      "disconnected",
      "connecting",
      "connected",
      "joining",
    ] as const) {
      expect(
        resolveRealtimeConnectionStatus({
          connected: state === "connected" || state === "joining",
          hasBeenOnline: false,
          joined: false,
          state,
        }),
      ).toBe("connecting");
    }
  });

  it("reports a failed first connection as unreachable while it retries", () => {
    expect(
      resolveRealtimeConnectionStatus({
        connected: false,
        hasBeenOnline: false,
        joined: false,
        state: "reconnecting",
      }),
    ).toBe("unreachable");
  });

  it("reports a dropped session as reconnecting until it joins again", () => {
    for (const state of ["disconnected", "reconnecting", "joining"] as const) {
      expect(
        resolveRealtimeConnectionStatus({
          connected: state === "joining",
          hasBeenOnline: true,
          joined: false,
          state,
        }),
      ).toBe("reconnecting");
    }
  });
});
