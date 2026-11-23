import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { EquipmentSetDock } from "@/components/equipment/equipment-set-dock";
import { WikiFooter } from "./wiki-footer";
import { WikiHeader } from "./wiki-header";

const PAGES_WITHOUT_DOCK = new Set(["/", "/set"]);

const FULL_WIDTH_PAGES = new Set(["/items", "/npcs"]);

export function WikiLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const docksSet = !PAGES_WITHOUT_DOCK.has(pathname);
  const isFullWidth = FULL_WIDTH_PAGES.has(pathname);

  return (
    <div
      className={cn(
        "app-content-frame flex min-h-dvh w-full flex-col bg-background text-foreground",
        docksSet && "pb-(--wiki-dock-height) [--wiki-dock-height:4.0625rem]",
      )}
    >
      <WikiHeader />
      <div
        className={cn(
          "mx-auto w-full flex-1 px-4 md:px-6",
          !isFullWidth && "max-w-[100rem] pb-10",
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
      <WikiFooter />
      {docksSet ? <EquipmentSetDock /> : null}
    </div>
  );
}
