import type { JsonValue } from "@lootlog/schema/http-scalars";
import { Option, Schema } from "effect";
import { useLocalStorage as useStoredValue } from "usehooks-ts";

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
