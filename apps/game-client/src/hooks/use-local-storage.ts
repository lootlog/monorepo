import type { JsonValue } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import { useLocalStorage as useStoredValue } from "usehooks-ts";

/**
 * Local storage state that trusts a persisted value only after it passes
 * `schema`. Malformed or outdated data reads as `initialValue` and stays in
 * storage until the next write.
 */
export const useLocalStorage = <T extends typeof JsonValue.Type>(
  key: string,
  initialValue: T,
  schema: Schema.Decoder<T>,
) =>
  useStoredValue<T>(key, initialValue, {
    deserializer: (item) => {
      try {
        return Option.getOrElse(
          Schema.decodeUnknownOption(schema)(JSON.parse(item)),
          () => initialValue,
        );
      } catch {
        return initialValue;
      }
    },
  });
