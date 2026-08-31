import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";
import type { Guild } from "#src/db/domain";

export const GuildData = createRequiredRequestValueDecorator<Guild>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.guild as Guild | undefined,
});
