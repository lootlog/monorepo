import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared";
import { ForbiddenException } from "@nestjs/common";
import type { Guild } from "generated/client";

export const GuildData = createRequiredRequestValueDecorator<Guild>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.guild as Guild | undefined,
});
