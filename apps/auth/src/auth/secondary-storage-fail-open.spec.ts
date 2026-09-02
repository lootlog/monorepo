import { describe, expect, it, mock } from "bun:test";
import type { SecondaryStorage } from "better-auth";
import {
  createFailOpenSecondaryStorage,
  type SecondaryStorageErrorHandler,
} from "./secondary-storage-fail-open.js";

describe("createFailOpenSecondaryStorage", () => {
  it("delegates successful storage operations", async () => {
    const storage = {
      get: mock((_key: string) => Promise.resolve("cached-value")),
      getAndDelete: mock((_key: string) => Promise.resolve("consumed-value")),
      increment: mock((_key: string, _ttl?: number) => Promise.resolve(2)),
      set: mock((_key: string, _value: string, _ttl?: number) =>
        Promise.resolve(undefined),
      ),
      delete: mock((_key: string) => Promise.resolve(undefined)),
    } satisfies SecondaryStorage;
    const onError = mock<SecondaryStorageErrorHandler>();
    const failOpenStorage = createFailOpenSecondaryStorage(storage, onError);

    await expect(failOpenStorage.get("session-token")).resolves.toBe(
      "cached-value",
    );
    await expect(
      failOpenStorage.getAndDelete?.("verification-token"),
    ).resolves.toBe("consumed-value");
    await expect(failOpenStorage.increment?.("rate-limit", 60)).resolves.toBe(
      2,
    );
    await expect(
      failOpenStorage.set("session-token", "payload", 300),
    ).resolves.toBeUndefined();
    await expect(
      failOpenStorage.delete("session-token"),
    ).resolves.toBeUndefined();

    expect(storage.get).toHaveBeenCalledWith("session-token");
    expect(storage.getAndDelete).toHaveBeenCalledWith("verification-token");
    expect(storage.increment).toHaveBeenCalledWith("rate-limit", 60);
    expect(storage.set).toHaveBeenCalledWith("session-token", "payload", 300);
    expect(storage.delete).toHaveBeenCalledWith("session-token");
    expect(onError).not.toHaveBeenCalled();
  });

  it("falls back when Redis storage operations fail", async () => {
    const error = new Error("redis unavailable");
    const storage = {
      get: mock(
        (_key: string): Promise<string | null> => Promise.reject(error),
      ),
      getAndDelete: mock(
        (_key: string): Promise<string | null> => Promise.reject(error),
      ),
      increment: mock(
        (_key: string, _ttl?: number): Promise<number> => Promise.reject(error),
      ),
      set: mock(
        (_key: string, _value: string, _ttl?: number): Promise<void> =>
          Promise.reject(error),
      ),
      delete: mock((_key: string): Promise<void> => Promise.reject(error)),
    } satisfies SecondaryStorage;
    const onError = mock<SecondaryStorageErrorHandler>();
    const failOpenStorage = createFailOpenSecondaryStorage(storage, onError);

    await expect(failOpenStorage.get("session-token")).resolves.toBeNull();
    await expect(
      failOpenStorage.getAndDelete?.("verification-token"),
    ).resolves.toBeNull();
    await expect(failOpenStorage.increment?.("rate-limit", 60)).resolves.toBe(
      1,
    );
    await expect(
      failOpenStorage.set("session-token", "payload", 300),
    ).resolves.toBeUndefined();
    await expect(
      failOpenStorage.delete("session-token"),
    ).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledWith("get", error);
    expect(onError).toHaveBeenCalledWith("getAndDelete", error);
    expect(onError).toHaveBeenCalledWith("increment", error);
    expect(onError).toHaveBeenCalledWith("set", error);
    expect(onError).toHaveBeenCalledWith("delete", error);
  });
});
