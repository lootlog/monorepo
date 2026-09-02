import * as z from "zod";

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const GuildDocumentContentSchema = jsonValueSchema.refine(
  (value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }

    const root = (value as Record<string, unknown>).root;
    return typeof root === "object" && root !== null && !Array.isArray(root);
  },
  {
    message: "Invalid Lexical editor state",
  },
);

export type GuildDocumentContent = JsonValue;
