// Deployment planning runs before dependencies are installed.
export const isString = (value: unknown): value is string =>
  typeof value === "string";

export const isObject = (value: unknown): value is object =>
  value !== null && typeof value === "object";
