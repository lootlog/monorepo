import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-border bg-card">
      <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-8 pt-6 pb-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://docs.lootlog.pl"
              className="hover:text-foreground transition-colors"
            >
              Dokumentacja
            </a>
            <a
              href="https://discord.gg/mPcczaeYMu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Discord
            </a>
            <a
              href="https://github.com/lootlog/monorepo"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/privacy-policy"
              className="hover:text-foreground transition-colors"
            >
              Prywatność
            </Link>
            <Link
              href="/terms-of-service"
              className="hover:text-foreground transition-colors"
            >
              Regulamin
            </Link>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 text-xs border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:text-pink-400"
              asChild
            >
              <a
                href="https://buycoffee.to/lootlog"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Heart className="w-3 h-3" />
                Wesprzyj
              </a>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Grafiki wykorzystane na stronie są własnością Garmory sp. z o.o.
              <br />
              Lootlog © {new Date().getFullYear()} • Open Source
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
