"use client";

import Link from "next/link";
import { Loader2, Heart, LogIn, Sword } from "lucide-react";
import { useSession } from "@/src/hooks/use-session";
import { authClient } from "@/src/lib/auth-client";
import { Button } from "@lootlog/ui/components/button";

export function LandingHeader() {
  const session = useSession();
  const isAuthenticated = !!session.data;
  const isLoading = session.isPending;

  const handleLoginAction = async () => {
    const url = `${window.location.href}@me`;

    await authClient.signIn.social({
      provider: "discord",
      callbackURL: url,
      scopes: ["guilds.members.read", "guilds", "identify", "email"],
    });
  };

  return (
    <header className="w-full border-b border-border bg-card">
      <div className="flex h-16 items-center px-4 md:px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight text-white"
          >
            lootlog.pl
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-4">
            <Link href="/docs" className="hover:text-primary transition-colors">
              Dokumentacja
            </Link>
            <a
              href="https://github.com/lootlog/monorepo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <Button disabled size="sm" className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isAuthenticated ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400"
                asChild
              >
                <a
                  href="https://buycoffee.to/lootlog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4 shrink-0" />
                  <span className="sr-only md:not-sr-only">Wesprzyj</span>
                </a>
              </Button>
              <Button size="sm" className="h-9" asChild>
                <a href="/@me" className="flex items-center">
                  <span className="md:hidden">Lootlog</span>
                  <span className="sr-only md:not-sr-only">
                    Przejdź do Lootloga
                  </span>
                </a>
              </Button>
            </>
          ) : (
            <Button size="sm" className="gap-2" onClick={handleLoginAction}>
              <LogIn className="w-4 h-4" />
              Zaloguj się
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
