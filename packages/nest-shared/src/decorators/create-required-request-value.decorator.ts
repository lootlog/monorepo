import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type RequestLike = {
  [key: string]: unknown;
  params?: Record<string, string | undefined>;
};

interface CreateRequiredRequestValueDecoratorOptions<Value> {
  createException: () => Error;
  getValue: (request: RequestLike) => Value | null | undefined;
}

export function createRequiredRequestValueDecorator<Value>({
  createException,
  getValue,
}: CreateRequiredRequestValueDecoratorOptions<Value>) {
  return createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Value => {
      const request = ctx.switchToHttp().getRequest<RequestLike>();
      const value = getValue(request);

      if (!value) {
        throw createException();
      }

      return value;
    },
  );
}
