import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestRealtimeTicket } from "./realtime-ticket";

describe("requestRealtimeTicket", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the authenticated HTTP boundary and returns a short-lived ticket", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ ticket: "single-use", expiresAt: Date.now() + 30_000 }),
      );
    await expect(requestRealtimeTicket()).resolves.toBe("single-use");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/realtime-ticket"),
      {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      },
    );
  });

  it("rejects an already expired ticket", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ ticket: "expired", expiresAt: Date.now() - 1 }),
    );
    await expect(requestRealtimeTicket()).rejects.toThrow(
      "invalid realtime ticket",
    );
  });
});
