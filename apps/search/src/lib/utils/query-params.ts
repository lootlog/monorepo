import { parseSchema } from "./schema.js";
import { type z } from "zod";

export const parseQueryParams = <T extends z.ZodTypeAny>(
  url: string,
  schema: T
) => {
  const { searchParams } = new URL(url);
  const queryParams = Object.fromEntries(searchParams);
  const trimmedParams = Object.keys(queryParams).reduce(
    (r: { [key: string]: string }, key) => (
      queryParams[key] && (r[key] = queryParams[key]), r
    ),
    {}
  );

  return parseSchema(trimmedParams, schema);
};
