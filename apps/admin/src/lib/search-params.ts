import { Option, Schema } from "effect";

export const readSearchParam = <A>(schema: Schema.Codec<A, unknown>) => {
  const decode = Schema.decodeUnknownOption(schema);

  return (value: A | {} | null | undefined) =>
    Option.getOrUndefined(decode(value));
};

export const readText = readSearchParam(
  Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
);

export const readYesNo = readSearchParam(Schema.Literals(["yes", "no"]));

const readPageText = readSearchParam(
  Schema.String.check(Schema.isPattern(/^(?:[2-9]|[1-9]\d{1,5})$/u)),
);

const readPageNumber = readSearchParam(
  Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(2),
    Schema.isLessThanOrEqualTo(999_999),
  ),
);

export const readPage = (value: {} | null | undefined): number | undefined => {
  const page = readPageText(value);

  return page === undefined ? readPageNumber(value) : Number(page);
};
