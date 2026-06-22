import type { Prisma } from "src/generated/prisma/client";
import { jsonValueSchema } from "src/shared/dto/zod-response-codecs";

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

export type GuildDocumentContent = Prisma.JsonValue;
