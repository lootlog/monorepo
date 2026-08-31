import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { jsonValueSchema } from "#src/shared/dto/zod-response-codecs";

type JsonValue = DatabaseJsonValue;

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
