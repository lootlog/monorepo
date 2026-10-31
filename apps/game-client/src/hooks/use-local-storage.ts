import type { JsonValue } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import { useLocalStorage as useStoredValue } from "usehooks-ts";

const decodeStoredValue = <T>(
  item: string | null,
  initialValue: T,
  schema: Schema.Decoder<T>,
): T => {
  if (item === null) return initialValue;

  try {
    return Option.getOrElse(
      Schema.decodeUnknownOption(schema)(JSON.parse(item)),
      () => initialValue,
    );
  } catch {
    return initialValue;
  }
};

/**
 * The value `useLocalStorage` holds for `key`, read once outside React (for
 * code that runs on game events). Blocked storage reads as `initialValue`.
 */
export const readLocalStorage = <T extends typeof JsonValue.Type>(
  key: string,
  initialValue: T,
  schema: Schema.Decoder<T>,
): T => {
  try {
    return decodeStoredValue(
      window.localStorage.getItem(key),
      initialValue,
      schema,
    );
  } catch {
    return initialValue;
  }
};

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
    deserializer: (item) => decodeStoredValue(item, initialValue, schema),
  });
