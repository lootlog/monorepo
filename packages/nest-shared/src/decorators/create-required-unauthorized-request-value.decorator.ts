import { UnauthorizedException } from "@nestjs/common";

import {
  type RequestLike,
  createRequiredRequestValueDecorator,
} from "./create-required-request-value.decorator";

export function createRequiredUnauthorizedRequestValueDecorator<Value>(
  getValue: (request: RequestLike) => Value | null | undefined,
) {
  return createRequiredRequestValueDecorator({
    createException: () => new UnauthorizedException(),
    getValue,
  });
}
