import type { JsonValue } from "@lootlog/schema/http-scalars";
import type { ZodType } from "zod";
import { useLocalStorage as useStoredValue } from "usehooks-ts";

/**
 * Local storage state that trusts a persisted value only after it passes
 * `schema`. Malformed or outdated data reads as `initialValue` and stays in
 * storage until the next write.
 */
export const useLocalStorage = <T extends typeof JsonValue.Type>(
  key: string,
  initialValue: T,
  schema: ZodType<T>,
) =>
  useStoredValue<T>(key, initialValue, {
    deserializer: (item) => {
      try {
        return schema.parse(JSON.parse(item));
      } catch {
        return initialValue;
      }
    },
  });
