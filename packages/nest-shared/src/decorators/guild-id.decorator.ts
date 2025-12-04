import {
  createParamDecorator,
  BadRequestException,
  type ExecutionContext,
} from "@nestjs/common";

export const GuildId = createParamDecorator(function (
  data: unknown,
  ctx: ExecutionContext,
) {
  const request = ctx.switchToHttp().getRequest();

  const guildId = request.params?.guildId;

  if (!guildId) {
    throw new BadRequestException("Guild ID is required");
  }

  return guildId;
});
