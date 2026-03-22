"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { links } from "@/src/config/links";

export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-8 py-8">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <a
              href={links.docs}
              className="hover:text-primary transition-colors"
            >
              {t("landing.footer.docs")}
            </a>
            <a
              href={links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {t("landing.footer.discord")}
            </a>
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {t("landing.footer.github")}
            </a>
            <Link
              href="/privacy-policy"
              className="hover:text-primary transition-colors"
            >
              {t("landing.footer.privacy")}
            </Link>
            <Link
              href="/terms-of-service"
              className="hover:text-primary transition-colors"
            >
              {t("landing.footer.terms")}
            </Link>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400"
              asChild
            >
              <a href={links.support} target="_blank" rel="noopener noreferrer">
                <Heart className="w-3 h-3" />
                {t("landing.footer.support")}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("landing.footer.legalNotice")}
              <br />
              {t("landing.footer.copyright", {
                year: new Date().getFullYear(),
              })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
