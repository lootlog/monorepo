import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { EquipmentSetDock } from "@/components/equipment/equipment-set-dock";
import { WikiHeader } from "./wiki-header";

// The home page introduces the wiki and the set page shows the whole set,
// so neither docks it.
const PAGES_WITHOUT_DOCK = new Set(["/", "/set"]);

// The item and NPC searches pin their filters to the screen's left edge and
// give the results every column the screen has.
const FULL_WIDTH_PAGES = new Set(["/items", "/npcs"]);

/**
 * A public site rather than an app: a bar on top, the page under it and the
 * User's equipment set docked at the bottom, so pages keep their whole
 * width and every item the User points at shows its change in the dock.
 */
export function WikiLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const docksSet = !PAGES_WITHOUT_DOCK.has(pathname);
  const isFullWidth = FULL_WIDTH_PAGES.has(pathname);

  return (
    <div
      className={cn(
        "app-content-frame flex min-h-dvh w-full flex-col bg-background text-foreground",
        // Pages that pin a column to the screen end it above the dock.
        docksSet && "[--wiki-dock-height:4.0625rem]",
      )}
    >
      <WikiHeader />
      <div
        className={cn(
          "mx-auto w-full flex-1 px-4 md:px-6",
          // A pinned column fills the screen down to the dock, so any space
          // left under it would scroll the page and cut off its top.
          isFullWidth
            ? "pb-(--wiki-dock-height)"
            : ["max-w-[100rem]", docksSet ? "pb-24" : "pb-10"],
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
