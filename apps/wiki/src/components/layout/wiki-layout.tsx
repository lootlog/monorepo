import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { EquipmentSetDock } from "@/components/equipment/equipment-set-dock";
import { WikiHeader } from "./wiki-header";

// The home page introduces the wiki and the set page shows the whole set,
// so neither docks it.
const PAGES_WITHOUT_DOCK = new Set(["/", "/set"]);

/**
 * A public site rather than an app: a bar on top, the page under it and the
 * User's equipment set docked at the bottom, so pages keep their whole
 * width and every item the User points at shows its change in the dock.
 */
export function WikiLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const docksSet = !PAGES_WITHOUT_DOCK.has(pathname);

  return (
    <div className="app-content-frame flex min-h-dvh w-full flex-col bg-background text-foreground">
      <WikiHeader />
      <div
        className={cn(
          "mx-auto w-full max-w-[100rem] flex-1 px-4 pb-10 md:px-6",
          docksSet && "pb-24",
        )}
      >
        <main
          id="portal-content"
          tabIndex={-1}
          className="min-w-0 outline-none"
        >
          {children}
        </main>
      </div>
      {docksSet ? <EquipmentSetDock /> : null}
    </div>
  );
}
