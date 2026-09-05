import { animate, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Loader2, LogIn } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";

import { links } from "@/src/config/links";
import { createAuthCallbackUrl } from "@/src/config/auth";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { useMatchingBackgroundMask } from "@/src/hooks/use-matching-background-mask";
import { MenuIcon } from "./menu-icon";
import { LootlogMark } from "./lootlog-mark";

export function LandingHeader() {
  const { t } = useTranslation();
  const session = useSession();
  const reducedMotion = useReducedMotion();
  const overlapRef = useMatchingBackgroundMask();
  const [isClientReady, setIsClientReady] = useState(false);
  const isAuthenticated = !!session.data;
  const isLoading = !isClientReady || session.isPending;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 0);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

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

  const closeNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
  };

  const navigationLinks = (
    <>
      <a
        onClick={closeNavigation}
        href="#product"
        className="rounded-md transition-colors hover:text-[var(--broadcast-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
      >
        {t("landing.header.product")}
      </a>
      <a
        onClick={closeNavigation}
        href="#workflow"
        className="rounded-md transition-colors hover:text-[var(--broadcast-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
      >
        {t("landing.header.workflow")}
      </a>
      <a
        onClick={closeNavigation}
        href="#trust"
        className="rounded-md transition-colors hover:text-[var(--broadcast-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
      >
        {t("landing.header.trust")}
      </a>
      <a
        onClick={closeNavigation}
        href="#faq"
        className="rounded-md transition-colors hover:text-[var(--broadcast-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
      >
        {t("landing.header.faq")}
      </a>
      <a
        onClick={closeNavigation}
        href={links.docs}
        className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-[var(--broadcast-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
      >
        {t("landing.header.docs")}
        <ArrowUpRight className="size-3.5" />
      </a>
      <a
        onClick={closeNavigation}
        href={links.support}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md text-[var(--broadcast-coral)] hover:text-[var(--broadcast-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-coral)]"
      >
        <Heart className="size-3.5" aria-hidden="true" />
        {t("landing.header.support")}
      </a>
    </>
  );

  const authAction = isLoading ? (
    <Button
      disabled
      size="sm"
      variant="outline"
      className="landing-auth-action h-12 w-52 shrink-0 rounded-full border-0 px-4 font-bold shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--broadcast-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--broadcast-ink)] disabled:opacity-80"
      aria-label={t("landing.header.loginLoading")}
    >
      <Loader2 className="size-4 animate-spin" />
    </Button>
  ) : isAuthenticated ? (
    <Button
      size="sm"
      variant="outline"
      className="landing-auth-action h-12 w-52 shrink-0 rounded-full border-0 px-4 font-bold shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--broadcast-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--broadcast-ink)] disabled:opacity-80"
      render={
        <a href={links.dashboard}>
          <span className="sm:hidden">{t("landing.header.lootlog")}</span>
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
      className="landing-auth-action h-12 w-52 shrink-0 rounded-full border-0 px-4 font-bold shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--broadcast-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--broadcast-ink)] disabled:opacity-80"
      aria-label={t("landing.header.login")}
      onClick={handleLoginAction}
      disabled={isSigningIn}
    >
      {isSigningIn ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogIn className="size-4" />
      )}
      <span>
        {isSigningIn
          ? t("landing.header.loginLoading")
          : t("landing.header.login")}
      </span>
    </Button>
  );

  return (
    <header className="landing-header relative" data-scrolled={scrolled}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-[var(--broadcast-ink)] transition-opacity duration-200 motion-reduce:transition-none min-[1200px]:hidden"
        style={{ opacity: scrolled ? 1 : 0 }}
      />
      <div className="mx-auto flex h-24 items-center justify-center px-5 sm:px-8 lg:px-12">
        <Link
          to="/"
          className="fixed left-3 top-6 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--broadcast-ink)] px-3 text-xl font-black tracking-[-0.035em] text-[var(--broadcast-white)] sm:left-8 lg:left-10 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]"
        >
          <LootlogMark className="size-7 shrink-0 rounded-md" />
          <span className="max-[379px]:sr-only">
            {t("landing.header.brand")}
          </span>
        </Link>

        <nav
          aria-label={t("landing.header.navigationLabel")}
          className="hidden items-center gap-4 text-xs font-semibold text-[var(--broadcast-text-muted)] min-[1200px]:flex xl:gap-6 xl:text-sm"
        >
          {navigationLinks}
        </nav>

        <div className="fixed right-10 top-6 z-50 isolate hidden items-center min-[1200px]:flex">
          {authAction}
          <span
            ref={overlapRef}
            aria-hidden="true"
            className="landing-button-overlap pointer-events-none absolute inset-0 rounded-full"
            style={{ clipPath: "path('M0 0')" }}
          />
        </div>
        <button
          type="button"
          popoverTarget="landing-navigation"
          aria-label={t("landing.header.openMenu")}
          className="fixed right-6 top-6 z-50 flex size-12 items-center justify-center rounded-full bg-[var(--broadcast-ink-soft)] text-[var(--broadcast-white)] hover:text-[var(--broadcast-lime)] focus-visible:outline-2 focus-visible:outline-[var(--broadcast-lime)] sm:right-8 min-[1200px]:hidden"
        >
          <MenuIcon open={menuOpen} />
        </button>
        <div
          id="landing-navigation"
          popover="auto"
          onBeforeToggle={(event) => {
            const panel = event.currentTarget;
            const opening = event.newState === "open";
            setMenuOpen(opening);
            animate(
              panel,
              {
                opacity: opening ? [0, 1] : [1, 0],
                scale: reducedMotion ? 1 : opening ? [0.05, 1] : [1, 0.05],
              },
              { duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
            );
          }}
          style={{ transformOrigin: "calc(100% - 36px) 36px" }}
          className="landing-navigation-popover fixed bottom-auto left-auto right-3 top-3 m-0 w-[min(24rem,calc(100%-1.5rem))] rounded-[var(--broadcast-radius-panel)] border-0 bg-[var(--broadcast-lime)] p-6 text-[var(--broadcast-ink)] sm:right-5"
        >
          <div className="mb-6 flex h-9 items-center justify-between pr-12">
            <span className="text-xl font-black">
              {t("landing.header.brand")}
            </span>
            <button
              type="button"
              popoverTarget="landing-navigation"
              popoverTargetAction="hide"
              aria-label={t("landing.header.closeMenu")}
              className="absolute right-3 top-3 flex size-12 items-center justify-center rounded-full bg-[var(--broadcast-ink)] text-[var(--broadcast-lime)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--broadcast-ink)]"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
          <nav
            aria-label={t("landing.header.navigationLabel")}
            className="flex flex-col gap-2 text-lg font-bold [&>a]:min-h-12 [&>a]:content-center [&>a]:px-3 [&>a]:text-[var(--broadcast-ink)] [&>a]:hover:bg-[var(--broadcast-ink)] [&>a]:hover:text-[var(--broadcast-lime)] [&>a]:focus-visible:bg-[var(--broadcast-ink)] [&>a]:focus-visible:text-[var(--broadcast-lime)] [&>a]:focus-visible:ring-[var(--broadcast-ink)] [&>a]:focus-visible:ring-offset-0"
          >
            {navigationLinks}
          </nav>
          <div className="landing-menu-auth mt-6 border-t border-[var(--broadcast-ink)]/20 pt-6">
            {authAction}
            {signInError && (
              <p role="alert" className="mt-3 text-sm">
                {t("landing.header.loginError")}
              </p>
            )}
          </div>
        </div>
      </div>

      {signInError && !menuOpen && (
        <div
          role="alert"
          className="fixed right-5 top-20 z-50 max-w-[calc(100vw-2.5rem)] sm:max-w-sm rounded-[var(--broadcast-radius-control)] bg-[var(--broadcast-error)] px-4 py-3 text-sm text-[var(--broadcast-error-text)] shadow-none sm:right-6 lg:right-8"
        >
          {t("landing.header.loginError")}
        </div>
      )}
    </header>
  );
}
