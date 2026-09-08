import { expect, test } from "bun:test";
import { configureLootlogApi } from "./index";
import { mainFetch } from "./mutators";

test("configured SDK sends key to explicit environment, omits cookies and never retries writes", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const restore = configureLootlogApi({
    apiKey: "test-key",
    environment: "development",
    fetch: async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response('{"code":"DENIED"}', {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    },
  });
  try {
    await expect(
      mainFetch("/loots", { method: "POST", body: "{}" }),
    ).rejects.toMatchObject({ status: 403, data: { code: "DENIED" } });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://dev-api.lootlog.pl/loots");
    expect(calls[0]?.init?.credentials).toBe("omit");
    expect(new Headers(calls[0]?.init?.headers).get("X-Api-Key")).toBe(
      "test-key",
    );
  } finally {
    restore();
  }
});
