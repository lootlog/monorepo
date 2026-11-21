import { PlatformRole } from "@lootlog/schema/platform-roles";
import { Option, Schema } from "effect";

export type UsersSearch = {
  search?: string;
  role?: PlatformRole;
  banned?: "yes" | "no";
  page?: number;
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

// The first page carries no number, so a link to it stays clean.
const readPageText = read(
  Schema.String.check(Schema.isPattern(/^(?:[2-9]|[1-9]\d{1,5})$/u)),
);

/** A page number from the address bar; anything else is the first page. */
export const readPage = (value: {} | null | undefined): number | undefined => {
  const page = readPageText(value);

  return page === undefined ? undefined : Number(page);
};

/**
 * The filters in the address bar. The filter form submits every field, so an
 * empty one means "no filter" rather than a filter for the empty string.
 */
export const validateUsersSearch = (search: {
  search?: unknown;
  role?: unknown;
  banned?: unknown;
  page?: unknown;
}): UsersSearch => {
  const result: UsersSearch = {};
  const text = readText(search.search);
  const role = readRole(search.role);
  const banned = readBanned(search.banned);
  const page = readPage(search.page);

  if (text !== undefined) result.search = text;

  if (role !== undefined) result.role = role;

  if (banned !== undefined) result.banned = banned;

  if (page !== undefined) result.page = page;

  return result;
};
