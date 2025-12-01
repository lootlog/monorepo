import { Filter, Calendar, Check, ChevronsUpDown, Activity, Monitor, Search } from "lucide-react";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@lootlog/ui/components/drawer";
import { cn } from "@lootlog/ui/lib/utils";
import { Badge } from "@lootlog/ui/components/badge";
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

type ActivityLogsFiltersMobileProps = {
  types: ActivityType[];
  sources: ActivitySource[];
  startDate: string;
  endDate: string;
  name: string;
  activeFiltersCount: number;
  typeOpen: boolean;
  sourceOpen: boolean;
  onTypeOpenChange: (open: boolean) => void;
  onSourceOpenChange: (open: boolean) => void;
  onTypeChange: (value: ActivityType) => void;
  onSourceChange: (value: ActivitySource) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNameChange: (value: string) => void;
};

export const ActivityLogsFiltersMobile = ({
  types,
  sources,
  startDate,
  endDate,
  name,
  activeFiltersCount,
  typeOpen,
  sourceOpen,
  onTypeOpenChange,
  onSourceOpenChange,
  onTypeChange,
  onSourceChange,
  onStartDateChange,
  onEndDateChange,
  onNameChange,
}: ActivityLogsFiltersMobileProps) => {
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>
        <Button className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtry</span>
          </div>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <DrawerHeader className="mb-4">
          <DrawerTitle>Filtry aktywności</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Szukaj po nazwie</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Nazwa gracza..."
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Typ aktywności</Label>
            <Popover
              open={typeOpen}
              onOpenChange={onTypeOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">
                      {types.length > 0
                        ? `${types.length} wybranych`
                        : "Wszystkie typy"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList>
                    <CommandEmpty>Brak opcji</CommandEmpty>
                    <CommandGroup>
                      {ACTIVITY_TYPES.map((type) => (
                        <CommandItem
                          key={type.value}
                          value={type.value}
                          onSelect={() => onTypeChange(type.value)}
                        >
                          {type.label}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              types.includes(type.value)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Źródło</Label>
            <Popover
              open={sourceOpen}
              onOpenChange={onSourceOpenChange}
              modal={false}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sourceOpen}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span className="text-sm">
                      {sources.length > 0
                        ? `${sources.length} wybranych`
                        : "Wszystkie źródła"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandList>
                    <CommandEmpty>Brak opcji</CommandEmpty>
                    <CommandGroup>
                      {ACTIVITY_SOURCES.map((source) => (
                        <CommandItem
                          key={source.value}
                          value={source.value}
                          onSelect={() => onSourceChange(source.value)}
                        >
                          {source.label}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              sources.includes(source.value)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Data początkowa</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate ? startDate.split("T")[0] : ""}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data końcowa</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate ? endDate.split("T")[0] : ""}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Zamknij
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
