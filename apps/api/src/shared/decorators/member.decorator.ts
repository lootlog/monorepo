import { createRequiredUnauthorizedRequestValueDecorator } from "@lootlog/nest-shared";

export const GuildMember = createRequiredUnauthorizedRequestValueDecorator(
  (request) => request.member,
);
