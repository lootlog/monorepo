import { z, type ZodType } from "zod";
import {
  CompiledCreateActivitySchema,
  CreateActivitySchema,
} from "./dto/create-activity.dto.js";
import {
  CompiledGuildMemberRemovedSchema,
  GuildMemberRemovedSchema,
} from "./services/activities-events.service.js";

const normalizeResult = (schema: ZodType, input: unknown) => {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, issues: result.error.issues };
};

const schemaCases = [
  {
    name: "activity create",
    schema: CreateActivitySchema,
    compiledSchema: CompiledCreateActivitySchema,
    validInput: {
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: "CONNECT_EVENT",
      source: "WEB_APP",
      details: { sessionId: "session-1" },
      idempotencyKey: "activity-1",
    },
    invalidInput: {
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: "CONNECT_EVENT",
      source: "WEB_APP",
      details: {},
      idempotencyKey: "activity-1",
    },
  },
  {
    name: "guild member removed",
    schema: GuildMemberRemovedSchema,
    compiledSchema: CompiledGuildMemberRemovedSchema,
    validInput: {
      discordId: "discord-1",
      guildId: "guild-1",
      userId: "user-1",
      id: "event-1",
    },
    invalidInput: {
      discordId: "",
      guildId: "guild-1",
    },
  },
] as const;

describe("compiled activity event schemas", () => {
  it.each(schemaCases)("preserves $name parsing behavior", (schemaCase) => {
    const strictCompiledSchema = z.compile(schemaCase.schema, { strict: true });
    expect(strictCompiledSchema).not.toBe(schemaCase.schema);

    for (const input of [
      schemaCase.validInput,
      schemaCase.invalidInput,
      { ...schemaCase.validInput, ignored: "value" },
    ]) {
      expect(normalizeResult(schemaCase.compiledSchema, input)).toEqual(
        normalizeResult(schemaCase.schema, input),
      );
    }
  });
});
