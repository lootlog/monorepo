import type { SecondaryStorage } from "better-auth";
import {
  createFailOpenSecondaryStorage,
  type SecondaryStorageErrorHandler,
} from "./secondary-storage-fail-open";

type SecondaryStorageGetAndDelete = NonNullable<
  SecondaryStorage["getAndDelete"]
>;
type SecondaryStorageIncrement = NonNullable<SecondaryStorage["increment"]>;

describe("createFailOpenSecondaryStorage", () => {
  it("delegates successful storage operations", async () => {
    const storage = {
      get: vi.fn<SecondaryStorage["get"]>().mockResolvedValue("cached-value"),
      getAndDelete: vi
        .fn<SecondaryStorageGetAndDelete>()
        .mockResolvedValue("consumed-value"),
      increment: vi.fn<SecondaryStorageIncrement>().mockResolvedValue(2),
      set: vi.fn<SecondaryStorage["set"]>().mockResolvedValue(undefined),
      delete: vi.fn<SecondaryStorage["delete"]>().mockResolvedValue(undefined),
    } satisfies SecondaryStorage;
    const onError = vi.fn<SecondaryStorageErrorHandler>();
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
      get: vi.fn<SecondaryStorage["get"]>().mockRejectedValue(error),
      getAndDelete: vi
        .fn<SecondaryStorageGetAndDelete>()
        .mockRejectedValue(error),
      increment: vi.fn<SecondaryStorageIncrement>().mockRejectedValue(error),
      set: vi.fn<SecondaryStorage["set"]>().mockRejectedValue(error),
      delete: vi.fn<SecondaryStorage["delete"]>().mockRejectedValue(error),
    } satisfies SecondaryStorage;
    const onError = vi.fn<SecondaryStorageErrorHandler>();
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

  it("uses get and delete when storage has no native getAndDelete", async () => {
    const storage = {
      get: vi.fn<SecondaryStorage["get"]>().mockResolvedValue("cached-value"),
      set: vi.fn<SecondaryStorage["set"]>().mockResolvedValue(undefined),
      delete: vi.fn<SecondaryStorage["delete"]>().mockResolvedValue(undefined),
    } satisfies SecondaryStorage;
    const failOpenStorage = createFailOpenSecondaryStorage(storage);

    await expect(failOpenStorage.getAndDelete?.("key")).resolves.toBe(
      "cached-value",
    );

    expect(storage.get).toHaveBeenCalledWith("key");
    expect(storage.delete).toHaveBeenCalledWith("key");
  });
});
