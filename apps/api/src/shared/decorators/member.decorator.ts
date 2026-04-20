import { createRequiredUnauthorizedRequestValueDecorator } from "@lootlog/nest-shared/decorators";

export const GuildMember = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.member,
);
