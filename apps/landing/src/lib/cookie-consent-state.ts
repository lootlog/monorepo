export const COOKIE_CONSENT_STORAGE_KEY = "cookie-consent";

export type CookieConsentDecision = "accepted" | "rejected";

type CookieConsentStorage = Pick<Storage, "getItem" | "setItem">;

export function readCookieConsent(
  storage: CookieConsentStorage,
): CookieConsentDecision | null {
  const storedDecision = storage.getItem(COOKIE_CONSENT_STORAGE_KEY);

  if (storedDecision === "accepted" || storedDecision === "rejected") {
    return storedDecision;
  }

  return null;
}

export function writeCookieConsent(
  storage: CookieConsentStorage,
  decision: CookieConsentDecision,
): void {
  storage.setItem(COOKIE_CONSENT_STORAGE_KEY, decision);
}
