import type { Logger } from "winston";

interface Identifiable {
  world?: string;
  id?: number;
  name?: string;
}

export function validateIndexableItems<T extends Identifiable>(
  items: T[],
  entityType: string,
  logger: Logger,
): T[] | undefined {
  const valid = items.filter((item) => item.world && item.id && item.name);

  if (valid.length === 0) {
    logger.warn(`No valid ${entityType} to index (missing required fields)`, {
      [entityType]: items,
    });
    return undefined;
  }

  if (valid.length !== items.length) {
    const invalid = items.filter(
      (item) => !item.world || !item.id || !item.name,
    );
    logger.warn(
      `Skipped ${invalid.length} ${entityType} due to missing required fields`,
      {
        [`invalid${entityType.charAt(0).toUpperCase()}${entityType.slice(1)}`]:
          invalid,
      },
    );
  }

  return valid;
}
