"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Cookie } from "lucide-react";

export function CookieConsent() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-md p-6 rounded-xl border border-white/[0.08] ring-1 ring-white/[0.04] bg-black/60 backdrop-blur-xl shadow-2xl shadow-black/50">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <Cookie className="w-6 h-6" />
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-foreground mb-1">
                {t("landing.cookieConsent.title")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("landing.cookieConsent.description")}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={acceptCookies}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]"
              >
                {t("landing.cookieConsent.accept")}
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem("cookie-consent", "rejected");
                  setIsVisible(false);
                }}
                variant="outline"
                size="sm"
                className="border-white/10 hover:bg-white/5 hover:text-foreground"
              >
                {t("landing.cookieConsent.reject")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
