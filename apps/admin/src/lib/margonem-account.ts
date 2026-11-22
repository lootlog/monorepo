export const GAME_ACCOUNT_ID = /^[1-9]\d{0,19}$/;

const PROFILE_LINK = /\/profile\/view,([1-9]\d{0,19})(?!\d)/;

export const readGameAccountId = (input: string): string | undefined => {
  const trimmed = input.trim();

  if (GAME_ACCOUNT_ID.test(trimmed)) return trimmed;

  return PROFILE_LINK.exec(trimmed)?.[1];
};
