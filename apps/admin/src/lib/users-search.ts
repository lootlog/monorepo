import { PlatformRole } from "@lootlog/schema/platform-roles";
import { Option, Schema } from "effect";

export type UsersSearch = {
  search?: string | undefined;
  role?: PlatformRole | undefined;
  banned?: "yes" | "no" | undefined;
  page?: number | undefined;
};

const read = <A>(schema: Schema.Codec<A, unknown>) => {
  const decode = Schema.decodeUnknownOption(schema);

  return (value: A | {} | null | undefined) =>
    Option.getOrUndefined(decode(value));
};

const readText = read(
  Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
);

const readRole = read(PlatformRole);

const readBanned = read(Schema.Literals(["yes", "no"]));

const readPageText = read(
  Schema.String.check(Schema.isPattern(/^(?:[2-9]|[1-9]\d{1,5})$/u)),
);

const readPageNumber = read(
  Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(2),
    Schema.isLessThanOrEqualTo(999_999),
  ),
);

export const readPage = (value: {} | null | undefined): number | undefined => {
  const page = readPageText(value);

  return page === undefined ? readPageNumber(value) : Number(page);
};

export const validateUsersSearch = (search: {
  search?: unknown;
  role?: unknown;
  banned?: unknown;
  page?: unknown;
}): UsersSearch => ({
  search: readText(search.search),
  role: readRole(search.role),
  banned: readBanned(search.banned),
  page: readPage(search.page),
});
