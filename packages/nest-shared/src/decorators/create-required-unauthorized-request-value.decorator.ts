import { UnauthorizedException } from "@nestjs/common";

import { createRequiredRequestValueDecorator } from "./create-required-request-value.decorator";

type RequestLike = {
  [key: string]: unknown;
  params?: Record<string, string | undefined>;
};

export function createRequiredUnauthorizedRequestValueDecorator<Value>(
  getValue: (request: RequestLike) => Value | null | undefined,
) {
  return createRequiredRequestValueDecorator({
    createException: () => new UnauthorizedException(),
    getValue,
  });
}
