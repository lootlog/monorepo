"use client";

import Link from "next/link";
import { Loader2, Heart, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";
import { links } from "@/src/config/links";

export function LandingHeader() {
  const { t } = useTranslation();
  const session = useSession();
  const isAuthenticated = !!session.data;
  const isLoading = session.isPending;

  const handleLoginAction = async () => {
    const url = `${window.location.origin}/@me`;

    await authClient.signIn.social({
      provider: "discord",
      callbackURL: url,
      scopes: ["guilds.members.read", "guilds", "identify", "email"],
    });
  };

  return (
    <header className="w-full border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex h-16 items-center px-4 md:px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-white hover:text-primary transition-colors"
          >
            {t("landing.header.brand")}
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-4">
            <a
              href={links.docs}
              className="hover:text-primary transition-colors"
            >
              {t("landing.header.docs")}
            </a>
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {t("landing.header.github")}
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400"
            asChild
          >
            <a
              href={links.support}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <Heart className="h-4 w-4 shrink-0" />
              <span className="sr-only md:not-sr-only">
                {t("landing.header.support")}
              </span>
            </a>
          </Button>
          {isLoading ? (
            <Button disabled size="sm" className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isAuthenticated ? (
            <Button
              size="sm"
              className="h-9 shadow-[0_0_15px_-5px_hsl(var(--primary))]"
              asChild
            >
              <a href={links.dashboard} className="flex items-center">
                <span className="md:hidden">{t("landing.header.lootlog")}</span>
                <span className="sr-only md:not-sr-only">
                  {t("landing.header.goToLootlog")}
                </span>
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-2 shadow-[0_0_15px_-5px_hsl(var(--primary))]"
              onClick={handleLoginAction}
            >
              <LogIn className="w-4 h-4" />
              {t("landing.header.login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
