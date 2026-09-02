import { DateTime, Option, Schema, SchemaGetter } from "effect";

const booleanString = Schema.Literals(["true", "false"]).pipe(
  Schema.decodeTo(Schema.Boolean, {
    decode: SchemaGetter.transform(
      (value: "true" | "false") => value === "true",
    ),
    encode: SchemaGetter.transform((value: boolean): "true" | "false" =>
      value ? "true" : "false",
    ),
  }),
);

const numberInput = Schema.Union([Schema.Number, Schema.NumberFromString]);

export const dateTimeString = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u),
  Schema.makeFilter((value) => Option.isSome(DateTime.make(value)), {
    expected: "a valid UTC date-time string",
  }),
);

export const booleanFromString = Schema.Union([Schema.Boolean, booleanString]);

export const intFromString = (options?: {
  readonly min?: number;
  readonly max?: number;
}) => {
  const integer = numberInput.check(Schema.isInt());

  if (options?.min !== undefined && options.max !== undefined) {
    return integer.check(
      Schema.isGreaterThanOrEqualTo(options.min),
      Schema.isLessThanOrEqualTo(options.max),
    );
  }
  if (options?.min !== undefined) {
    return integer.check(Schema.isGreaterThanOrEqualTo(options.min));
  }
  if (options?.max !== undefined) {
    return integer.check(Schema.isLessThanOrEqualTo(options.max));
  }
  return integer;
};

export const commaSeparatedArray = <
  S extends Schema.Codec<string, string, never, never>,
>(
  itemSchema: S,
) => {
  const items = Schema.mutable(Schema.Array(itemSchema));
  const fromString = Schema.String.pipe(
    Schema.decodeTo(items, {
      decode: SchemaGetter.transform((value) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
      encode: SchemaGetter.transform((value) => value.join(",")),
    }),
  );

  return Schema.Union([items, fromString]);
};
