export const isEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || Array.isArray(value))
    return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T | undefined,
  keys: readonly K[],
): Partial<Pick<T, K>> => {
  const result: Record<string, unknown> = {};
  if (!obj) return result as Partial<Pick<T, K>>;

  for (const key of keys) {
    if (key in obj) {
      result[key as string] = obj[key];
    }
  }
  return result as Partial<Pick<T, K>>;
};

export const get = <T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T,
): T => {
  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return defaultValue as T;
    }
  }

  return result as T;
};
