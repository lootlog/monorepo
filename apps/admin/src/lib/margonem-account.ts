/** A Margonem account id, as the API accepts it. */
export const GAME_ACCOUNT_ID = /^[1-9]\d{0,19}$/;

// `https://www.margonem.pl/profile/view,10145667#char_36132,luvia` names the
// account after `view,`; the fragment names one of its characters.
const PROFILE_LINK = /\/profile\/view,([1-9]\d{0,19})(?!\d)/;

/**
 * The Margonem account a pasted profile link or a bare account id names, or
 * undefined when the text names none.
 */
export const readGameAccountId = (input: string): string | undefined => {
  const trimmed = input.trim();

  if (GAME_ACCOUNT_ID.test(trimmed)) return trimmed;

  return PROFILE_LINK.exec(trimmed)?.[1];
};
