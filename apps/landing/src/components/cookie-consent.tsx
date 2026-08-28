import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/src/lib/cookie-consent-state";

export function CookieConsent() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = readCookieConsent(localStorage);
    if (!consent) {
      // The persisted decision is only available after browser hydration.
      // oxlint-disable-next-line react/set-state-in-effect
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    writeCookieConsent(localStorage, "accepted");
    setIsVisible(false);
  };

  const rejectCookies = () => {
    writeCookieConsent(localStorage, "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-6 sm:max-w-md">
      <div
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        className="rounded-2xl bg-[#f4f1e8] p-4 text-[#0a1830] shadow-[16px_22px_56px_rgba(0,0,0,0.34)] sm:p-5"
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#0a1830] pb-3">
          <h2
            id="cookie-consent-title"
            className="text-base font-black tracking-[-0.02em]"
          >
            {t("landing.cookieConsent.title")}
          </h2>
          <span
            className="size-3 rounded-full bg-[#ffbd3f]"
            aria-hidden="true"
          />
        </div>
        <p
          id="cookie-consent-description"
          className="mt-3 text-sm leading-6 text-[#4c5869]"
        >
          {t("landing.cookieConsent.description")}
        </p>
        <div className="mt-4 flex gap-3">
          <Button
            onClick={acceptCookies}
            className="h-11 flex-1 rounded-xl bg-[#3157f6] px-5 font-bold text-white shadow-none hover:bg-[#4168ff] sm:flex-none"
          >
            {t("landing.cookieConsent.accept")}
          </Button>
          <Button
            onClick={rejectCookies}
            variant="outline"
            className="h-11 flex-1 rounded-xl border-2 border-[#0a1830] bg-transparent px-5 font-bold text-[#0a1830] hover:bg-[#0a1830] hover:text-white sm:flex-none"
          >
            {t("landing.cookieConsent.reject")}
          </Button>
        </div>
      </div>
    </div>
  );
}
