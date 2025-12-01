import { Activity, Monitor, Calendar, Search } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import type {
  ActivityType,
  ActivitySource,
} from "@/hooks/api/activity-logs/use-activity-logs";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "LOOT_EVENT", label: "Loot" },
  { value: "TIMER_EVENT", label: "Timer" },
  { value: "CONNECT_EVENT", label: "Połączenie" },
  { value: "DISCONNECT_EVENT", label: "Rozłączenie" },
];

const ACTIVITY_SOURCES: { value: ActivitySource; label: string }[] = [
  { value: "GAME", label: "Gra" },
  { value: "WEB_APP", label: "Aplikacja Web" },
];

type ActivityLogsFiltersDesktopProps = {
  types: ActivityType[];
  sources: ActivitySource[];
  startDate: string;
  endDate: string;
  name: string;
  onTypeChange: (value: ActivityType) => void;
  onSourceChange: (value: ActivitySource) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNameChange: (value: string) => void;
};

export const ActivityLogsFiltersDesktop = ({
  types,
  sources,
  startDate,
  endDate,
  name,
  onTypeChange,
  onSourceChange,
  onStartDateChange,
  onEndDateChange,
  onNameChange,
}: ActivityLogsFiltersDesktopProps) => {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <Label className="text-xs text-muted-foreground">Szukaj po nazwie</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Nazwa gracza..."
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full pl-9 h-10"
          />
        </div>
      </div>

      <FilterPopover
        options={ACTIVITY_TYPES}
        value={types}
        onValueChange={onTypeChange}
        placeholder="Typ aktywności"
        icon={Activity}
        width="w-[200px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0 ? `${count} wybranych` : "Typ aktywności"
        }
      />

      <FilterPopover
        options={ACTIVITY_SOURCES}
        value={sources}
        onValueChange={onSourceChange}
        placeholder="Źródło"
        icon={Monitor}
        width="w-[180px]"
        multiSelect
        showSearch={false}
        renderTriggerLabel={(count) =>
          count > 0 ? `${count} wybranych` : "Źródło"
        }
      />

      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Data początkowa</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={startDate ? startDate.split("T")[0] : ""}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full pl-9 h-10"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[180px]">
        <Label className="text-xs text-muted-foreground">Data końcowa</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={endDate ? endDate.split("T")[0] : ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full pl-9 h-10"
          />
        </div>
      </div>
    </div>
  );
};
