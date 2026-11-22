export const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/gu, (character) => `\\${character}`)}%`;
