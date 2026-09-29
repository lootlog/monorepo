import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { getTestInstance } from "better-auth/test";
import { Schema } from "effect";
import {
  GAME_CLIENT_HANDOFF_TTL_SECONDS,
  gameClientHandoff,
} from "./game-client-handoff.js";

const decodeHandoff = Schema.decodeUnknownSync(
  Schema.Struct({ code: Schema.String }),
);

const decodeSession = Schema.decodeUnknownSync(
  Schema.NullOr(Schema.Struct({ user: Schema.Struct({ id: Schema.String }) })),
);

const GAME_ORIGIN = "https://luvia.margonem.pl";

const BASE_URL = "http://localhost:3000/api/auth";

const setup = async () => {
  const instance = await getTestInstance({
    plugins: [gameClientHandoff()],
    trustedOrigins: ["https://*.margonem.pl"],
    advanced: { defaultCookieAttributes: { sameSite: "none", secure: true } },
  });

  const { headers } = await instance.signInWithTestUser();

  const mintCode = async (origin = GAME_ORIGIN) => {
    const response = await instance.auth.handler(
      new Request(`${BASE_URL}/game-client/handoff`, {
        method: "POST",
        headers: {
          cookie: headers.get("cookie") ?? "",
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({ origin }),
      }),
    );

    return {
      status: response.status,
      code: response.ok ? decodeHandoff(await response.json()).code : undefined,
    };
  };

  const exchange = (code: string, origin = GAME_ORIGIN) =>
    instance.auth.handler(
      new Request(`${BASE_URL}/game-client/exchange`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    );

  const sessionUserId = async (setCookie: string) => {
    const [cookie] = setCookie.split(";");

    const response = await instance.auth.handler(
      new Request(`${BASE_URL}/get-session`, {
        headers: { cookie: cookie ?? "" },
      }),
    );

    return decodeSession(await response.json())?.user.id;
  };

  return { ...instance, headers, mintCode, exchange, sessionUserId };
};

afterEach(() => setSystemTime());

describe("Game client login handoff", () => {
  it("redeems a code once, from its own origin, into a partitioned session cookie", async () => {
    const { mintCode, exchange, sessionUserId, auth, headers } = await setup();
    const { code } = await mintCode();

    const response = await exchange(code ?? "");

    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain("token");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Partitioned");
    expect(setCookie).toContain("SameSite=None");
    const session = await auth.api.getSession({ headers });
    expect(await sessionUserId(setCookie)).toBe(session?.user.id);

    expect((await exchange(code ?? "")).status).toBe(400);
  });

  it("burns a code presented by another origin", async () => {
    const { mintCode, exchange } = await setup();
    const { code } = await mintCode();

    expect(
      (await exchange(code ?? "", "https://other.margonem.pl")).status,
    ).toBe(400);
    expect((await exchange(code ?? "")).status).toBe(400);
  });

  it("rejects an expired code and codes for non-game origins", async () => {
    const { mintCode, exchange } = await setup();
    const { code } = await mintCode();

    setSystemTime(Date.now() + (GAME_CLIENT_HANDOFF_TTL_SECONDS + 1) * 1_000);

    expect((await exchange(code ?? "")).status).toBe(400);
    expect((await mintCode("https://evilmargonem.pl")).status).toBe(400);
    expect((await mintCode("http://luvia.margonem.pl")).status).toBe(400);
  });

  it("clears the partitioned copy on sign-out", async () => {
    const { auth, headers } = await setup();

    const response = await auth.handler(
      new Request(`${BASE_URL}/sign-out`, {
        method: "POST",
        headers: {
          cookie: headers.get("cookie") ?? "",
          origin: "http://localhost:3000",
        },
      }),
    );

    expect(response.headers.getSetCookie()).toContainEqual(
      expect.stringMatching(/session_token=;.*Max-Age=0.*Partitioned/u),
    );
  });
});
