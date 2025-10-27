"use client";

import { useState, useEffect } from "react";
import { Button } from "@lootlog/ui/components/button";

export function CookieConsent() {
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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-background/95 backdrop-blur-lg border border-white/10 rounded-lg p-4 shadow-2xl">
        <p className="text-sm text-gray-300 mb-3">
          Używamy plików cookie do zapamiętywania preferencji i poprawy
          działania strony.
        </p>
        <div className="flex gap-2">
          <Button onClick={acceptCookies} size="sm" className="flex-1">
            Akceptuję
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
            className="flex-1"
          >
            Odrzuć
          </Button>
        </div>
      </div>
    </div>
  );
}
