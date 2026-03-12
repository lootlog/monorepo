import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared";
import { UnauthorizedException } from "@nestjs/common";

export const GuildMember = createRequiredRequestValueDecorator({
  createException: () => new UnauthorizedException(),
  getValue: (request) => request.member,
});
