import { ChevronUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { cn } from "cn";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { EQUIPMENT_SLOTS } from "@/lib/equipment-slots";
import { EquipmentSetPanel } from "./equipment-set-panel";

/** The set on narrow screens: a bar at the bottom that opens the full panel. */
export function EquipmentSetBar() {
  const { set } = useEquipmentSet();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center gap-3 border-t border-sidebar-border bg-sidebar/90 px-4 text-left backdrop-blur-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset lg:hidden"
          />
        }
      >
        <span className="text-sm font-semibold text-foreground">
          {t("equipment.title")}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          {EQUIPMENT_SLOTS.map((slot) => {
            const Icon = slot.icon;

            return (
              <Icon
                key={slot.id}
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  set.items[slot.id] === undefined
                    ? "text-muted-foreground/50"
                    : "text-primary",
                )}
              />
            );
          })}
        </span>
        <ChevronUp
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-4">
        <SheetTitle className="sr-only">{t("equipment.title")}</SheetTitle>
        <EquipmentSetPanel />
      </SheetContent>
    </Sheet>
  );
}
