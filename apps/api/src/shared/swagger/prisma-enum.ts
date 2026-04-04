import type { ApiPropertyOptions } from "@nestjs/swagger";

type SwaggerStringEnumOptions = Omit<
  ApiPropertyOptions,
  "enum" | "enumName" | "isArray" | "type"
> & {
  required?: boolean;
};

type SwaggerStringEnum = Record<string, string>;

export function swaggerStringEnum(
  enumName: string,
  enumObject: SwaggerStringEnum,
  options: SwaggerStringEnumOptions = {},
): ApiPropertyOptions {
  return {
    ...options,
    type: "string",
    enum: Object.values(enumObject),
    enumName,
  } as ApiPropertyOptions;
}

export function swaggerStringEnumArray(
  enumName: string,
  enumObject: SwaggerStringEnum,
  options: SwaggerStringEnumOptions = {},
): ApiPropertyOptions {
  return {
    ...swaggerStringEnum(enumName, enumObject, options),
    isArray: true,
  } as ApiPropertyOptions;
}
