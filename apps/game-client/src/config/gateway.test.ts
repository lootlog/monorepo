import { describe, expect, it } from "vitest";
import { GATEWAY_SOCKET_PATH } from "./gateway";

describe("gateway configuration", () => {
  it("uses the local reverse-proxy websocket route", () => {
    expect(GATEWAY_SOCKET_PATH).toBe("/gateway/ws");
  });
});
