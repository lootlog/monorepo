import { Link } from "@tanstack/react-router";
import { EquipmentGrid } from "@/components/equipment/equipment-grid";
import { t } from "@/i18n/messages";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

/** The game's equipment, each slot opening the item search for it. */
export function SlotSearch() {
  return (
    <EquipmentGrid
      size="lg"
      renderSlot={(slot) => {
        const Icon = slot.icon;

        return (
          <Link
            to="/items"
            search={{ ...EMPTY_ITEMS_SEARCH, slot: slot.id }}
            className="group/slot flex size-full flex-col items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card text-muted-foreground outline-none transition-[color,border-color,background-color] duration-150 hover:border-primary/60 hover:bg-primary/8 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <Icon
              aria-hidden="true"
              className="size-6 transition-[scale] duration-150 group-hover/slot:scale-110 motion-reduce:transition-none"
            />
            <span className="px-1 text-center text-[0.6875rem] leading-tight font-medium text-foreground">
              {t(`slots.${slot.id}`)}
            </span>
          </Link>
        );
      }}
    />
  );
}
