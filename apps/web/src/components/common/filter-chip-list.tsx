import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { FilterChipButton } from "@lootlog/ui/components/filter-chip-button";
import { CollapsePresence } from "@/components/common/collapse-presence";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";

export type FilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type FilterChipListProps = {
  chips: FilterChip[];
  clearLabel: string;
  onClear: () => void;
  className?: string;
};

const CHIP_HIDDEN = { opacity: 0, scale: 0.8 };

const CHIP_SHOWN = { opacity: 1, scale: 1 };

export const FilterChipList = ({
  chips,
  clearLabel,
  onClear,
  className,
}: FilterChipListProps) => (
  <CollapsePresence open={chips.length > 0}>
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-background/55 px-3 py-2",
        className,
      )}
    >
      <div className="relative flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((chip) => (
            <m.div
              key={chip.id}
              layout
              initial={CHIP_HIDDEN}
              animate={CHIP_SHOWN}
              exit={CHIP_HIDDEN}
              transition={{
                duration: MOTION_DURATION.short,
                ease: EASE_EMPHASIZED,
              }}
              className="flex max-w-full min-w-0"
            >
              <FilterChipButton onRemove={chip.onRemove}>
                {chip.label}
              </FilterChipButton>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="shrink-0"
        onClick={onClear}
      >
        {clearLabel}
      </Button>
    </div>
  </CollapsePresence>
);
