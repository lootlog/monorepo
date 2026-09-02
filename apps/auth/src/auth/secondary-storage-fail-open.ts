import type { SecondaryStorage } from "better-auth";

type SecondaryStorageOperation =
  | "get"
  | "getAndDelete"
  | "increment"
  | "set"
  | "delete";

export type SecondaryStorageErrorHandler = (
  operation: SecondaryStorageOperation,
  error: unknown,
) => void;

const noopErrorHandler: SecondaryStorageErrorHandler = () => {};

export function createFailOpenSecondaryStorage(
  storage: SecondaryStorage,
  onError: SecondaryStorageErrorHandler = noopErrorHandler,
): SecondaryStorage {
  return {
    async get(key) {
      try {
        return await storage.get(key);
      } catch (error) {
        onError("get", error);
        return null;
      }
    },
    async getAndDelete(key) {
      try {
        return await storage.getAndDelete(key);
      } catch (error) {
        onError("getAndDelete", error);
        return null;
      }
    },
    async increment(key, ttl) {
      try {
        return await storage.increment(key, ttl);
      } catch (error) {
        onError("increment", error);
        return 1;
      }
    },
    async set(key, value, ttl) {
      try {
        await storage.set(key, value, ttl);
      } catch (error) {
        onError("set", error);
      }
    },
    async delete(key) {
      try {
        await storage.delete(key);
      } catch (error) {
        onError("delete", error);
      }
    },
  };
}
