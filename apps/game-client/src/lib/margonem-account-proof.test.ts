import { MARGONEM_ACCOUNT_VALIDATE_URL } from "@/config/api";
import {
  createMargonemAccountProofToken,
  requestMargonemAccountProof,
} from "./margonem-account-proof";

function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("margonem-account-proof", () => {
  it("creates per-socket, per-account tokens with a fresh nonce", () => {
    const tokenA = createMargonemAccountProofToken({
      socketId: "socket-1",
      accountId: "20",
      characterId: "10",
      clanId: 15191,
    });
    const tokenB = createMargonemAccountProofToken({
      socketId: "socket-1",
      accountId: "20",
      characterId: "10",
      clanId: 15191,
    });

    expect(tokenA).toMatch(
      /^lootlog:socket-1:20:02000000000000000a0000000000003b57[a-f0-9]{32}$/,
    );
    expect(tokenB).toMatch(
      /^lootlog:socket-1:20:02000000000000000a0000000000003b57[a-f0-9]{32}$/,
    );
    expect(tokenA).not.toBe(tokenB);
  });

  it("uses a no-clan sentinel when the current character has no clan", () => {
    const token = createMargonemAccountProofToken({
      socketId: "socket-1",
      accountId: "20",
      characterId: "10",
      nonce: "0123456789abcdef0123456789abcdef",
    });

    expect(token).toBe(
      "lootlog:socket-1:20:02000000000000000affffffffffffffff0123456789abcdef0123456789abcdef",
    );
  });

  it("requests Margonem proof with POST form data and credentials", async () => {
    const fetchFn = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      const token = body.get("token") ?? "";

      return Promise.resolve(
        createJsonResponse({
          user_id: "20",
          token,
          ts: 1_700_000_000,
          validatedString: `20+${token}+1700000000`,
          signatureBase64: "signature",
        }),
      );
    });

    await expect(
      requestMargonemAccountProof({
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: 15191,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      userId: "20",
      characterId: "10",
      clanId: 15191,
      token: expect.stringMatching(
        /^lootlog:socket-1:20:02000000000000000a0000000000003b57[a-f0-9]{32}$/,
      ),
      ts: 1_700_000_000,
      validatedString: expect.stringMatching(
        /^20\+lootlog:socket-1:20:02000000000000000a0000000000003b57[a-f0-9]{32}\+1700000000$/,
      ),
      signatureBase64: "signature",
    });

    expect(fetchFn).toHaveBeenCalledWith(MARGONEM_ACCOUNT_VALIDATE_URL, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: expect.any(URLSearchParams),
    });
  });

  it("rejects proof for a different Margonem account", async () => {
    const fetchFn = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      const token = body.get("token") ?? "";

      return Promise.resolve(
        createJsonResponse({
          user_id: "21",
          token,
          ts: 1_700_000_000,
          validatedString: `21+${token}+1700000000`,
          signatureBase64: "signature",
        }),
      );
    });

    await expect(
      requestMargonemAccountProof({
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: 15191,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Margonem account proof does not match current account");
  });

  it("rejects proof for a different request token", async () => {
    const fetchFn = vi.fn(() =>
      Promise.resolve(
        createJsonResponse({
          user_id: "20",
          token:
            "lootlog:socket-1:20:02000000000000000a0000000000003b57ffffffffffffffffffffffffffffffff",
          ts: 1_700_000_000,
          validatedString:
            "20+lootlog:socket-1:20:02000000000000000a0000000000003b57ffffffffffffffffffffffffffffffff+1700000000",
          signatureBase64: "signature",
        }),
      ),
    );

    await expect(
      requestMargonemAccountProof({
        socketId: "socket-1",
        accountId: "20",
        characterId: "10",
        clanId: 15191,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toThrow("Margonem account proof does not match current account");
  });
});
