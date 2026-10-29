import type { ReactNode } from "react";
import { EquipmentSetBar } from "@/components/equipment/equipment-set-bar";
import { EquipmentSetPanel } from "@/components/equipment/equipment-set-panel";
import { t } from "@/i18n/messages";
import { WikiHeader } from "./wiki-header";

/**
 * A public site rather than an app: a bar on top, the page under it and the
 * User's equipment set beside it on every page. Below `lg` the set becomes a
 * bar at the bottom of the screen, so pages keep room for it.
 */
export function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-content-frame flex min-h-dvh w-full flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        {t("navigation.skipToContent")}
      </a>
      <WikiHeader />
      <div className="mx-auto grid w-full max-w-[100rem] flex-1 items-start gap-6 px-4 pb-20 md:px-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pb-10">
        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
        <aside
          aria-label={t("equipment.title")}
          className="sticky top-20 mt-6 hidden rounded-xl border border-border/50 bg-card p-4 lg:block"
        >
          <EquipmentSetPanel />
        </aside>
      </div>
      <EquipmentSetBar />
    </div>
  );
}
