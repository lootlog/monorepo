import { PlatformRole } from "@lootlog/schema/platform-roles";
import { Option, Schema } from "effect";

export type UsersSearch = {
  search?: string | undefined;
  role?: PlatformRole | undefined;
  banned?: "yes" | "no" | undefined;
  /** Whether the User holds an aura grant: in general or a personal one. */
  aura?: "yes" | "no" | undefined;
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

const readYesNo = read(Schema.Literals(["yes", "no"]));

// The first page carries no number, so a link to it stays clean.
const readPageText = read(
  Schema.String.check(Schema.isPattern(/^(?:[2-9]|[1-9]\d{1,5})$/u)),
);

const readPageNumber = read(
  Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(2),
    Schema.isLessThanOrEqualTo(999_999),
  ),
);

/**
 * A page number; anything else is the first page. The address bar holds it as
 * text, and the router validates its own result again, where it is a number.
 */
export const readPage = (value: {} | null | undefined): number | undefined => {
  const page = readPageText(value);

  return page === undefined ? readPageNumber(value) : Number(page);
};

/**
 * The filters in the address bar. The filter form submits every field, so an
 * empty one means "no filter" rather than a filter for the empty string.
 *
 * Every key is returned, as undefined when it holds no filter: the router
 * lays this result over the raw address, so a key left out would keep its raw
 * value and reach the loader unvalidated.
 */
export const validateUsersSearch = (search: {
  search?: unknown;
  role?: unknown;
  banned?: unknown;
  aura?: unknown;
  page?: unknown;
}): UsersSearch => ({
  search: readText(search.search),
  role: readRole(search.role),
  banned: readYesNo(search.banned),
  aura: readYesNo(search.aura),
  page: readPage(search.page),
});
