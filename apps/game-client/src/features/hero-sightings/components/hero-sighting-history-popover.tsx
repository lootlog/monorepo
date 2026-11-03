import { History } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HeroSightingHistory } from "@/features/hero-sightings/components/hero-sighting-history";
import type { HeroSightingRow } from "@/features/hero-sightings/hero-sighting-rows";

type HeroSightingHistoryPopoverProps = {
  row: HeroSightingRow;
  now: number;
};

/** Opens the hero's latest sightings in each Lootlog of the row. */
export function HeroSightingHistoryPopover({
  row,
  now,
}: HeroSightingHistoryPopoverProps) {
  const { t } = useTranslation("heroSightings");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={t("history.open", { name: row.hero.name })}>
          <History aria-hidden className="ll:size-3.5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="ll:w-80 ll:p-2">
        <HeroSightingHistory row={row} now={now} />
      </PopoverContent>
    </Popover>
  );
}
