import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import type { Guild } from "#src/generated/prisma/client";

export const GuildData = createRequiredRequestValueDecorator<Guild>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.guild as Guild | undefined,
});
