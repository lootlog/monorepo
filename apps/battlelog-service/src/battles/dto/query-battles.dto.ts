import { z } from "@hono/zod-openapi";

const emptyStringToUndefined = (value: unknown) => {
  if (value === "") {
    return undefined;
  }

  return value;
};

const booleanFromQuery = z.preprocess((value) => {
  if (value === "true" || value === true) {
    return true;
  }
  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean());

const intFromQuery = (options?: { min?: number; max?: number }) => {
  let schema = z.coerce.number().int();
  if (options?.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options?.max !== undefined) {
    schema = schema.max(options.max);
  }
  return z.preprocess(emptyStringToUndefined, schema);
};

const multiValueQuery = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }
    return [value];
  }, z.array(itemSchema));

export const queryBattlesSchema = z.object({
  cursor: z.string().optional(),
  size: z.coerce.number().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeTotal: booleanFromQuery.default(false),
  world: z.string().optional(),
  type: multiValueQuery(z.enum(["solo", "group"])).optional(),
  userId: z.string().optional(),
  public: booleanFromQuery.optional(),
  characterId: multiValueQuery(z.string()).optional(),
  search: z.string().optional(),
  result: multiValueQuery(z.enum(["won", "lost", "flee"])).optional(),
  ph: booleanFromQuery.optional(),
  matchmaking: booleanFromQuery.optional(),
  minLevel: intFromQuery({ min: 1, max: 1000 }).optional(),
  maxLevel: intFromQuery({ min: 1, max: 1000 }).optional(),
});

export type SortOrder = "asc" | "desc";
export type QueryBattlesDto = z.infer<typeof queryBattlesSchema>;
