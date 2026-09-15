import { Check, ChevronDown } from "lucide-react";
import { useState, type FC, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { NpcType } from "@/api/npcs.api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toolbarStripLightDividerClassName } from "@/components/ui/toolbar-strip";
import { NPC_NAMES } from "@/constants/margonem";

export const NPC_TYPE_FILTER_OPTIONS = [
  NpcType.ELITE2,
  NpcType.ELITE3,
  NpcType.HERO,
  NpcType.TITAN,
];

type TimersNpcTypeFilterProps = {
  selectedNpcTypes: NpcType[];
  onChange: (selectedNpcTypes: NpcType[]) => void;
};

const ICON_SIZE = 12;

/**
 * One strip cell that opens the monster type checklist, so the filter row
 * does not show a second row of tiles under the guild switcher. Right-click
 * on an entry keeps only that type, like the old inline toggles did.
 */
export const TimersNpcTypeFilter: FC<TimersNpcTypeFilterProps> = ({
  selectedNpcTypes,
  onChange,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const selected = new Set(selectedNpcTypes);

  const toggle = (type: NpcType) => {
    onChange(
      selected.has(type)
        ? selectedNpcTypes.filter((entry) => entry !== type)
        : [...selectedNpcTypes, type],
    );
  };

  const selectOnly = (event: MouseEvent<HTMLButtonElement>, type: NpcType) => {
    event.preventDefault();
    onChange([type]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("filters.npcTypesLabel")}
          aria-expanded={open}
          className={cn(
            toolbarStripLightDividerClassName,
            "ll-custom-cursor-pointer ll:flex ll:h-full ll:shrink-0 ll:items-center ll:gap-1 ll:bg-transparent ll:px-2 ll:pt-px ll:text-[11px] ll:text-gray-200 ll:transition-colors ll:hover:bg-white/5 ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring",
            open && "ll:bg-white/5",
          )}
        >
          <span>{t("filters.npcTypes")}</span>
          <span className="ll:font-semibold ll:text-white ll:tabular-nums">
            {selected.size}/{NPC_TYPE_FILTER_OPTIONS.length}
          </span>
          <ChevronDown aria-hidden="true" className="ll:size-3 ll:opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="ll-action-menu ll:w-40 ll:overflow-hidden ll:p-0"
      >
        <div
          role="group"
          aria-label={t("filters.npcTypesLabel")}
          className="ll:flex ll:flex-col"
        >
          {NPC_TYPE_FILTER_OPTIONS.map((type) => {
            const isSelected = selected.has(type);

            return (
              <Button
                key={type}
                size="xs"
                variant="menu"
                aria-pressed={isSelected}
                className={cn(
                  "ll:w-full ll:justify-between ll:capitalize",
                  !isSelected && "ll:text-muted-foreground",
                )}
                onClick={() => toggle(type)}
                onContextMenu={(event) => selectOnly(event, type)}
              >
                <span>{NPC_NAMES[type].longname}</span>
                {isSelected ? (
                  <Check size={ICON_SIZE} aria-hidden="true" />
                ) : null}
              </Button>
            );
          })}
        </div>
        <p className="ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:px-2 ll:py-1 ll:text-[10px] ll:text-muted-foreground">
          {t("filters.npcTypesOnlyHint")}
        </p>
      </PopoverContent>
    </Popover>
  );
};
