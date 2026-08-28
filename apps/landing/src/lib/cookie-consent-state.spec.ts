import { describe, expect, it } from "vitest";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsent,
  writeCookieConsent,
} from "./cookie-consent-state";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem(key: string) {
      return key === COOKIE_CONSENT_STORAGE_KEY ? value : null;
    },
    setItem(key: string, nextValue: string) {
      if (key === COOKIE_CONSENT_STORAGE_KEY) {
        value = nextValue;
      }
    },
  };
}

describe("cookie consent persistence", () => {
  it("shows consent when no valid decision exists", () => {
    expect(readCookieConsent(createStorage())).toBeNull();
    expect(readCookieConsent(createStorage("unknown"))).toBeNull();
  });

  it.each(["accepted", "rejected"] as const)(
    "persists the %s decision",
    (decision) => {
      const storage = createStorage();

      writeCookieConsent(storage, decision);

      expect(readCookieConsent(storage)).toBe(decision);
    },
  );
});
