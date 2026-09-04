import { describe, expect, it } from "vitest";
import { resolveGatewaySocketPath } from "./gateway";

describe("resolveGatewaySocketPath", () => {
  it("uses the public gateway websocket route by default", () => {
    expect(resolveGatewaySocketPath({})).toBe("/ws");
  });

  it("preserves an explicit deployment route", () => {
    expect(
      resolveGatewaySocketPath({ VITE_GATEWAY_SOCKET_PATH: "/socket" }),
    ).toBe("/socket");
  });
});
