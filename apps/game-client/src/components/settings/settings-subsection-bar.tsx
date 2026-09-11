import type { FC } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SettingsSubsectionOption = { id: string; label: string };

type SettingsSubsectionBarProps = {
  label: string;
  options: SettingsSubsectionOption[];
  activeId: string;
  onSelect: (id: string) => void;
};

/**
 * Subsection switcher above the domain content. Its own tabs root drives
 * navigation only; the selected subsection renders through the settings path.
 */
export const SettingsSubsectionBar: FC<SettingsSubsectionBarProps> = ({
  label,
  options,
  activeId,
  onSelect,
}) => (
  <Tabs
    value={activeId}
    onValueChange={(id) => onSelect(String(id))}
    className="ll:shrink-0 ll:px-4"
  >
    {/* Matches the search field height so both columns share one top row. */}
    <TabsList
      aria-label={label}
      className="ll:gap-1.5 ll:rounded-none ll:bg-transparent ll:p-0 ll:group-data-horizontal/tabs:h-8"
    >
      {options.map((option) => (
        <TabsTrigger
          key={option.id}
          value={option.id}
          className="ll:flex-none ll:bg-secondary ll:px-3 ll:text-secondary-foreground ll:hover:bg-white/15"
        >
          <span className="ll:truncate">{option.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
