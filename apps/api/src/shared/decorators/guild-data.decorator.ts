import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import { guildTable } from "#src/database/drizzle/schema";

type Guild = typeof guildTable.$inferSelect;

export const GuildData = createRequiredRequestValueDecorator<Guild>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.guild as Guild | undefined,
});
