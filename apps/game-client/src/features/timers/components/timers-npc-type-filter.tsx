import { ChevronDown } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { NpcType } from "@/api/npcs.api";
import { ChecklistMenu } from "@/components/checklist-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toolbarStripLightDividerClassName } from "@/components/ui/toolbar-strip";

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

/**
 * One strip cell that opens the monster type checklist, so the filter row
 * does not show a second row of tiles under the guild switcher. Each entry's
 * "only" button (or a right-click on the entry) keeps only that type.
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
        className="ll-action-menu ll:w-44 ll:overflow-hidden ll:p-0"
      >
        <ChecklistMenu
          aria-label={t("filters.npcTypesLabel")}
          items={NPC_TYPE_FILTER_OPTIONS.map((type) => ({
            value: type,
            label: t(`common:npcTypes.${type.toLowerCase()}`),
          }))}
          selected={selected}
          onToggle={toggle}
          only={{
            text: t("filters.npcTypesOnly"),
            getLabel: (type) => t("filters.npcTypesOnlyLabel", { type }),
            onSelect: (type) => onChange([type]),
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
