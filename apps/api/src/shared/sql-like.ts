/** `%text%` LIKE pattern that matches `text` literally, escaping `%`, `_` and `\`. */
export const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`;
