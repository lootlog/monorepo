import type { FieldOutputTypes } from "../../prisma/contract.js";
import { createRequiredRequestValueDecorator } from "@lootlog/nest-shared/decorators";
import { ForbiddenException } from "@nestjs/common";

type Guild = FieldOutputTypes["public"]["Guild"];

export const GuildData = createRequiredRequestValueDecorator<Guild>({
  createException: () => new ForbiddenException(),
  getValue: (request) => request.guild as Guild | undefined,
});
