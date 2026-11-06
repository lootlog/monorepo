import { Link } from "@tanstack/react-router";
import { ChevronUp } from "lucide-react";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Button } from "@lootlog/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import { EquipmentSetHeader } from "./equipment-set-header";
import { EquipmentSetSlot } from "./equipment-set-slot";
import { EquipmentKeyStats } from "./equipment-key-stats";
import { EquipmentSetWindow } from "./equipment-set-window";

/**
 * The set docked at the bottom of every page: its slots and key stats,
 * which glide to their new values as the set changes, opening up into the
 * full character window.
 */
export function EquipmentSetDock() {
  const { wornItems } = useSetSummary();

  return (
    <Sheet>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-4 px-4 md:px-6">
          <p className="shrink-0 text-sm font-semibold text-foreground max-sm:hidden">
            {t("equipment.title")}{" "}
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {wornItems.size}/{EQUIPMENT_SLOTS.length}
            </span>
          </p>
          <ul className="flex min-w-0 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
            {EQUIPMENT_SLOTS.map((slot) => (
              <li key={slot.id} className="size-11 shrink-0">
                <EquipmentSetSlot slot={slot} worn={wornItems.get(slot.id)} />
              </li>
            ))}
          </ul>
          <EquipmentKeyStats className="ml-auto max-xl:hidden" />
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 max-xl:ml-auto"
                icon={<ChevronUp />}
              />
            }
          >
            {t("setLayout.openWindow")}
          </SheetTrigger>
        </div>
      </div>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto p-5 md:p-8"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <SheetTitle className="sr-only">{t("equipment.title")}</SheetTitle>
          <EquipmentSetHeader titleId="set-dock-title">
            <ChevronLink className="ml-2" render={<Link to="/set" />}>
              {t("setLayout.openPage")}
            </ChevronLink>
          </EquipmentSetHeader>
          <EquipmentSetWindow />
        </div>
      </SheetContent>
    </Sheet>
  );
}
