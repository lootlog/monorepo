import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSetSummary } from "@/hooks/use-set-summary";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import { EquipmentSetActions } from "./equipment-set-actions";
import { EquipmentSetCharacter } from "./equipment-set-character";
import { EquipmentSetPanel } from "./equipment-set-panel";
import { EquipmentSetSlot } from "./equipment-set-slot";
import { EquipmentSetStats } from "./equipment-set-stats";

export function EquipmentSetDock() {
  const { wornItems } = useSetSummary();
  const { lastEquip } = useEquipmentSet();

  const count = (
    <span className="text-xs font-medium text-muted-foreground tabular-nums">
      {t("equipment.wornCount", {
        worn: wornItems.size,
        total: EQUIPMENT_SLOTS.length,
      })}
    </span>
  );

  return (
    <Sheet>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/90 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-3 px-4 md:gap-4 md:px-6">
          <div className="flex min-w-0 flex-1 basis-0 items-center gap-4 max-sm:hidden">
            <div className="flex shrink-0 items-baseline gap-2">
              <ChevronLink
                className="text-sm font-semibold text-foreground"
                render={<Link to="/set" />}
              >
                {t("equipment.title")}
              </ChevronLink>
              {count}
            </div>
            <EquipmentSetCharacter className="w-52 shrink-0 max-lg:hidden" />
          </div>
          <ul className="flex min-w-0 gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
            {EQUIPMENT_SLOTS.map((slot) => (
              <li key={slot.id} className="relative size-11 shrink-0">
                <EquipmentSetSlot slot={slot} worn={wornItems.get(slot.id)} />
                {lastEquip?.slotId === slot.id ? (
                  <span
                    key={lastEquip.serial}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 animate-arrival rounded-lg motion-reduce:animate-none"
                  />
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 justify-end max-sm:ml-auto sm:flex-1 sm:basis-0">
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  icon={<ChevronUp />}
                />
              }
            >
              {t("setLayout.openWindow")}
            </SheetTrigger>
          </div>
        </div>
      </div>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 p-0">
        <ScrollArea orientation="vertical" className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 md:p-6">
            <div className="flex items-center gap-1 pr-8">
              <SheetTitle className="flex flex-1 items-baseline gap-2 text-base font-semibold text-foreground">
                {t("equipment.title")}
                {count}
              </SheetTitle>
              <EquipmentSetActions compact />
              <ChevronLink className="ml-2" render={<Link to="/set" />}>
                {t("setLayout.openPage")}
              </ChevronLink>
            </div>
            <div className="grid items-start gap-5 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-8">
              <EquipmentSetPanel />
              <EquipmentSetStats />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
