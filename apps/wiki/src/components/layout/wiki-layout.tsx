import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { EquipmentSetBar } from "@/components/equipment/equipment-set-bar";
import { EquipmentSetPanel } from "@/components/equipment/equipment-set-panel";
import { t } from "@/i18n/messages";
import { WikiHeader } from "./wiki-header";

/**
 * A public site rather than an app: a bar on top, the page under it and the
 * User's equipment set beside it on the pages that search and show items.
 * Below `lg` the set becomes a bar at the bottom of the screen, so pages keep
 * room for it. The home page introduces the wiki and leaves the set out.
 */
export function WikiLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showsSet = pathname !== "/";

  return (
    <div className="app-content-frame flex min-h-dvh w-full flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        {t("navigation.skipToContent")}
      </a>
      <WikiHeader />
      <div
        className={cn(
          "mx-auto grid w-full max-w-[100rem] flex-1 items-start gap-6 px-4 pb-10 md:px-6",
          showsSet && "pb-20 lg:grid-cols-[minmax(0,1fr)_17rem] lg:pb-10",
        )}
      >
        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
        {showsSet ? (
          <aside
            aria-label={t("equipment.title")}
            className="sticky top-20 mt-6 hidden rounded-xl border border-border/50 bg-card p-4 lg:block"
          >
            <EquipmentSetPanel />
          </aside>
        ) : null}
      </div>
      {showsSet ? <EquipmentSetBar /> : null}
    </div>
  );
}
