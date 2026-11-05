import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { MapPin, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/components/ui/search-input";

type GameMap = { id: number; name: string };

type GameMapPickerProps<Map extends GameMap> = {
  /** Labels the search input. */
  id: string;
  search: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  /** The game maps matching the search, without those already added. */
  maps: Map[];
  onAdd: (map: Map) => void;
  noResultsLabel: string;
  hintLabel: string;
  /** Blocks adding while a previous add is saving. */
  isAdding?: boolean;
};

/** Searches Margonem's maps and adds one per click, as event and template forms do. */
export const GameMapPicker = <Map extends GameMap>({
  id,
  search,
  onSearchChange,
  placeholder,
  maps,
  onAdd,
  noResultsLabel,
  hintLabel,
  isAdding = false,
}: GameMapPickerProps<Map>) => (
  <div className="space-y-2">
    <SearchInput
      id={id}
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      placeholder={placeholder}
    />
    <ScrollArea className="relative h-48 rounded-lg border">
      {isAdding && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <Spinner className="size-5 text-primary" />
        </div>
      )}
      {maps.length > 0 ? (
        <div className="divide-y">
          {maps.map((map) => (
            <button
              key={map.id}
              type="button"
              disabled={isAdding}
              onClick={() => onAdd(map)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset enabled:cursor-pointer enabled:hover:bg-muted/40 disabled:cursor-default motion-reduce:transition-none"
            >
              <MapPin
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1 text-sm break-words">
                {map.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {map.id}
              </span>
              <Plus
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          compact
          icon={search ? Search : MapPin}
          title={search ? noResultsLabel : hintLabel}
        />
      )}
    </ScrollArea>
  </div>
);
