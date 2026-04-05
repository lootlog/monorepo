import { UnauthorizedException } from "@nestjs/common";

import { createRequiredRequestValueDecorator } from "./create-required-request-value.decorator";
import type { RequestLike } from "./types";

export function createRequiredUnauthorizedRequestValueDecorator<Value>(
  getValue: (request: RequestLike) => Value | null | undefined,
) {
  return createRequiredRequestValueDecorator({
    createException: () => new UnauthorizedException(),
    getValue,
  });
}
