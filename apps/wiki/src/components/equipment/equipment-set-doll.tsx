import { cn } from "cn";
import { useSetSummary } from "@/hooks/use-set-summary";
import { EquipmentGrid } from "./equipment-grid";
import { EquipmentSetSlot } from "./equipment-set-slot";

/** The set's slots as the game draws them, on a lit panel. */
export function EquipmentSetDoll({
  size = "md",
  className,
}: {
  size?: "md" | "xl";
  className?: string;
}) {
  const { wornItems } = useSetSummary();

  return (
    <div
      className={cn(
        "relative isolate flex justify-center overflow-hidden rounded-xl border border-border/50 bg-background/50 py-4",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(65%_55%_at_50%_45%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent_75%)]"
      />
      <EquipmentGrid
        size={size}
        renderSlot={(slot) => (
          <EquipmentSetSlot slot={slot} worn={wornItems.get(slot.id)} />
        )}
      />
    </div>
  );
}
