import { BadRequestException } from "@nestjs/common";

import { createRequiredRequestValueDecorator } from "./create-required-request-value.decorator.js";

export const GuildId = createRequiredRequestValueDecorator({
  createException: () => new BadRequestException("Guild ID is required"),
  getValue: (request) => request.params?.guildId,
});
