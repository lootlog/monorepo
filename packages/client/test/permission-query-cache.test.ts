import { describe, expect, test } from "bun:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { resetPermissionQueries } from "../src/permission-query-cache";

describe("permission query cache", () => {
  test("removes visible and inactive organization data before refetch completes", async () => {
    const client = new QueryClient();
    const timerKey = ["/timers", { world: "alpha" }];
    client.setQueryData(timerKey, [{ npc: { lvl: 105 } }]);
    client.setQueryData(["/guilds/one/timers/npc/history"], ["hidden history"]);
    client.setQueryData(["/guilds/one/chat-messages"], ["hidden titan"]);
    client.setQueryData(["/guilds/one/loots/1"], { npc: "titan" });
    client.setQueryData(["/users/@me/feed"], ["hidden loot"]);
    client.setQueryData(["/timer-settings"], { sound: true });
    let finish: (value: unknown[]) => void = () => {};
    const observer = new QueryObserver(client, {
      queryKey: timerKey,
      staleTime: Infinity,
      placeholderData: (previousData) => previousData,
      queryFn: () =>
        new Promise<unknown[]>((resolve) => {
          finish = resolve;
        }),
    });
    const unsubscribe = observer.subscribe(() => {});
    const reset = resetPermissionQueries(client);
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(
      client.getQueryData(["/guilds/one/timers/npc/history"]),
    ).toBeUndefined();
    expect(client.getQueryData(["/guilds/one/chat-messages"])).toBeUndefined();
    expect(client.getQueryData(["/guilds/one/loots/1"])).toBeUndefined();
    expect(client.getQueryData(["/users/@me/feed"])).toBeUndefined();
    expect(client.getQueryData(["/timer-settings"])).toEqual({ sound: true });
    finish([]);
    await reset;
    expect(observer.getCurrentResult().data).toEqual([]);
    unsubscribe();
    client.clear();
  });
  test("cannot restore old data from a request started before revocation", async () => {
    const client = new QueryClient();
    const key = ["/guilds/one/timers"];
    client.setQueryData(key, ["hidden titan"]);
    let finishOld: (value: string[]) => void = () => {};
    let requestCount = 0;
    const observer = new QueryObserver(client, {
      queryKey: key,
      retry: false,
      queryFn: () => {
        requestCount += 1;
        if (requestCount === 1) {
          return new Promise<string[]>((resolve) => {
            finishOld = resolve;
          });
        }
        return Promise.reject(new Error("Forbidden"));
      },
    });
    const unsubscribe = observer.subscribe(() => {});
    await resetPermissionQueries(client);
    finishOld(["hidden titan"]);
    await Promise.resolve();
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(client.getQueryData(key)).toBeUndefined();
    expect(observer.getCurrentResult().status).toBe("error");
    unsubscribe();
    client.clear();
  });
});
