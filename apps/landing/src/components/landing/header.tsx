import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Loader2, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { links } from "@/src/config/links";
import { createAuthCallbackUrl } from "@/src/config/auth";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { LootlogMark } from "./lootlog-mark";

export function LandingHeader() {
  const { t } = useTranslation();
  const session = useSession();
  const [isClientReady, setIsClientReady] = useState(false);
  const isAuthenticated = !!session.data;
  const isLoading = !isClientReady || session.isPending;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);

  useEffect(() => {
    // Session UI intentionally stays in its loading state until hydration.
    // oxlint-disable-next-line react/set-state-in-effect
    setIsClientReady(true);
  }, []);

  const handleLoginAction = async () => {
    setIsSigningIn(true);
    setSignInError(false);

    try {
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: createAuthCallbackUrl(window.location.origin),
        scopes: ["guilds.members.read", "guilds", "identify", "email"],
      });

      if (result.error) {
        setSignInError(true);
      }
    } catch {
      setSignInError(true);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#07111f]/95 shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-[96rem] items-center px-5 sm:px-8 lg:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md text-xl font-black tracking-[-0.035em] text-[#f7f8f2] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
        >
          <LootlogMark className="size-7 shrink-0 rounded-md" />
          {t("landing.header.brand")}
        </Link>

        <nav
          aria-label={t("landing.header.navigationLabel")}
          className="ml-10 hidden items-center gap-7 text-sm font-semibold text-[#9fb1ca] lg:flex"
        >
          <a
            href="#product"
            className="rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.header.product")}
          </a>
          <a
            href="#workflow"
            className="rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.header.workflow")}
          </a>
          <a
            href="#trust"
            className="rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.header.trust")}
          </a>
          <a
            href="#faq"
            className="rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.header.faq")}
          </a>
          <a
            href={links.docs}
            className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-[#c8f135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"
          >
            {t("landing.header.docs")}
            <ArrowUpRight className="size-3.5" />
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isLoading ? (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="h-11 min-w-11 rounded-xl border-[#3b4d67] bg-transparent text-[#d8e3f1] disabled:opacity-70"
              aria-label={t("landing.header.loginLoading")}
            >
              <Loader2 className="size-4 animate-spin" />
            </Button>
          ) : isAuthenticated ? (
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-xl border-[#3b4d67] bg-transparent px-3 font-bold text-[#e6edf7] transition-[background-color,transform] hover:bg-[#14233a] hover:text-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f] md:hidden"

              render={
                <a href={links.dashboard}>
                  <span className="sm:hidden">
                    {t("landing.header.lootlog")}
                  </span>
                  <span className="hidden sm:inline">
                    {t("landing.header.goToLootlog")}
                  </span>
                  <ArrowUpRight className="size-3.5" />
                </a>
              }
              nativeButton={false}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-11 rounded-xl border-[#3b4d67] bg-transparent px-3 font-bold text-[#e6edf7] transition-[background-color,transform] hover:bg-[#14233a] hover:text-white motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f] disabled:opacity-70"
              onClick={handleLoginAction}
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              <span className="hidden sm:inline">
                {isSigningIn
                  ? t("landing.header.loginLoading")
                  : t("landing.header.login")}
              </span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-11 rounded-xl border-[#ff665b]/35 bg-[#ff665b]/10 px-3 font-bold text-[#ff9a92] transition-[background-color,color,transform] hover:border-[#ff665b]/55 hover:bg-[#ff665b]/20 hover:text-[#ffc1bc] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#ff665b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f]"

            render={
              <a
                href={links.support}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("landing.header.support")}
              >
                <Heart className="size-4 fill-current" />
                <span className="hidden sm:inline">
                  {t("landing.header.support")}
                </span>
              </a>
            }
            nativeButton={false}
          />

          <Button
            size="sm"
            className="hidden h-11 rounded-xl bg-[#c8f135] px-4 font-bold text-[#07111f] shadow-none transition-[background-color,transform] hover:bg-[#d8ff5a] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#35d3e4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#07111f] md:inline-flex"

            render={
              <a href={links.dashboard}>
                {t("landing.header.goToLootlog")}
                <ArrowUpRight className="size-4" />
              </a>
            }
            nativeButton={false}
          />
        </div>
      </div>

      {signInError && (
        <div
          role="alert"
          className="absolute right-4 top-[calc(100%+0.5rem)] max-w-sm rounded-xl bg-[#541f1b] px-4 py-3 text-sm text-[#ffe8e5] shadow-[10px_14px_32px_rgba(0,0,0,0.3)] sm:right-6 lg:right-8"
        >
          {t("landing.header.loginError")}
        </div>
      )}
    </header>
  );
}
