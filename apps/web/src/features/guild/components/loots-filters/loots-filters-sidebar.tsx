import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { Label } from "@lootlog/ui/components/label";
import { Input } from "@lootlog/ui/components/input";
import { Badge } from "@lootlog/ui/components/badge";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { FC } from "react";
import { FilterCombobox } from "./filter-combobox";
import { NpcType, useNpcs } from "@/hooks/api/game-data/use-npcs";
import { useGuildPlayers } from "@/hooks/api/game-data/use-guild-players";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import { useDebounceValue } from "usehooks-ts";
import { cn } from "@lootlog/ui/lib/utils";

const DEFAULT_DEBOUNCE_MS = 500;

const raritiesData = [
  { value: ItemRarity.LEGENDARY, label: "Legendarny" },
  { value: ItemRarity.HEROIC, label: "Heroiczny" },
  { value: ItemRarity.UNIQUE, label: "Unikatowy" },
];

const npcTypesData = [
  { value: NpcType.COLOSSUS, label: "Kolos" },
  { value: NpcType.TITAN, label: "Tytan" },
  { value: NpcType.HERO, label: "Heros" },
  { value: NpcType.EVENT_HERO, label: "Heros Eventowy" },
  { value: NpcType.ELITE3, label: "Elita III" },
  { value: NpcType.ELITE2, label: "Elita II" },
  { value: NpcType.ELITE, label: "Elita" },
  { value: NpcType.NPC, label: "NPC" },
];

const quickFilters = [
  {
    label: "Legendarny",
    category: "Przedmiot",
    apply: (currentFilters: LootsFiltersSidebarProps["filters"]) => ({
      ...currentFilters,
      rarities: [ItemRarity.LEGENDARY],
    }),
  },
  {
    label: "Tytan",
    category: "Potwór",
    apply: (currentFilters: LootsFiltersSidebarProps["filters"]) => ({
      ...currentFilters,
      npcTypes: [NpcType.TITAN],
    }),
  },
  {
    label: "Heros",
    category: "Potwór",
    apply: (currentFilters: LootsFiltersSidebarProps["filters"]) => ({
      ...currentFilters,
      npcTypes: [NpcType.HERO],
    }),
  },
];

type LootsFiltersSidebarProps = {
  filters: {
    players?: string[];
    npcs?: string[];
    rarities?: string[];
    npcTypes?: string[];
    npcLevelMin?: string;
    npcLevelMax?: string;
    itemLevelMin?: string;
    itemLevelMax?: string;
    playerLevelMin?: string;
    playerLevelMax?: string;
  };
  onFilterChange: (filters: LootsFiltersSidebarProps["filters"]) => void;
  onSave: (filters?: LootsFiltersSidebarProps["filters"]) => void;
  onClear: () => void;
  className?: string;
};

export const LootsFiltersSidebar: FC<LootsFiltersSidebarProps> = ({
  filters,
  onFilterChange,
  onSave,
  onClear,
  className,
}) => {
  const [debouncedPlayersSearchValue, setDebouncedPlayersSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const [debouncedNpcsSearchValue, setDebouncedNpcsSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);

  const { data: playersData, isLoading: playersDataLoading } = useGuildPlayers({
    search: debouncedPlayersSearchValue,
    selectedPlayers: filters.players?.join(","),
  });

  const { data: npcsData, isLoading: npcsDataLoading } = useNpcs({
    search: debouncedNpcsSearchValue,
    selectedNpcs: filters.npcs?.join(","),
  });

  const playersOptions =
    playersData?.map((player) => ({
      value: player.name,
      label: player.name,
    })) ?? [];

  const npcsOptions =
    npcsData?.map((npc) => ({
      value: npc.name,
      label: npc.name,
    })) ?? [];

  const hasActiveFilters = Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== "";
  });

  return (
    <div
      className={cn(
        "w-[320px] bg-background flex flex-col h-full shrink-0",
        className,
      )}
    >
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Szybkie filtry</Label>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter, index) => (
                  <Badge
                    key={index}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => {
                      const newFilters = filter.apply(filters);
                      onFilterChange(newFilters);
                      onSave(newFilters);
                    }}
                  >
                    <span className="text-xs opacity-80">
                      {filter.category}:
                    </span>
                    <span className="ml-1">{filter.label}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <Accordion
              type="multiple"
              defaultValue={["npc", "item", "player"]}
              className="space-y-4"
            >
              <AccordionItem value="npc" className="space-y-3">
                <AccordionTrigger>Filtry potworów</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Typy potworów
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {npcTypesData.map((npcType) => (
                        <div
                          key={npcType.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`npcType-${npcType.value}`}
                            checked={filters.npcTypes?.includes(npcType.value)}
                            onCheckedChange={(checked) => {
                              const currentTypes = filters.npcTypes ?? [];
                              const newTypes = checked
                                ? [...currentTypes, npcType.value]
                                : currentTypes.filter(
                                    (t) => t !== npcType.value,
                                  );
                              onFilterChange({
                                ...filters,
                                npcTypes: newTypes,
                              });
                            }}
                          />
                          <Label
                            htmlFor={`npcType-${npcType.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {npcType.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Potwory
                    </Label>
                    <FilterCombobox
                      name="npcs"
                      placeholder="Wybierz potwory"
                      options={npcsOptions}
                      defaultValue={filters.npcs}
                      onSelect={(_, values) =>
                        onFilterChange({ ...filters, npcs: values })
                      }
                      controlledSearch
                      onSearchChange={setDebouncedNpcsSearchValue}
                      searchValue={debouncedNpcsSearchValue}
                      loading={npcsDataLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Min poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.npcLevelMin ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            npcLevelMin: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Max poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={filters.npcLevelMax ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            npcLevelMax: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                        className="h-8"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <Separator />

              <AccordionItem value="item" className="space-y-3">
                <AccordionTrigger>Filtry przedmiotów</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Rzadkość
                    </Label>
                    <div className="flex flex-col gap-2">
                      {raritiesData.map((rarity) => (
                        <div
                          key={rarity.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`rarity-${rarity.value}`}
                            checked={filters.rarities?.includes(rarity.value)}
                            onCheckedChange={(checked) => {
                              const currentRarities = filters.rarities ?? [];
                              const newRarities = checked
                                ? [...currentRarities, rarity.value]
                                : currentRarities.filter(
                                    (r) => r !== rarity.value,
                                  );
                              onFilterChange({
                                ...filters,
                                rarities: newRarities,
                              });
                            }}
                          />
                          <Label
                            htmlFor={`rarity-${rarity.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {rarity.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Min poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.itemLevelMin ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            itemLevelMin: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Max poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={filters.itemLevelMax ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            itemLevelMax: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                        className="h-8"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <Separator />

              <AccordionItem value="player" className="space-y-3">
                <AccordionTrigger>Filtry graczy</AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Gracze
                    </Label>
                    <FilterCombobox
                      name="players"
                      placeholder="Wybierz graczy"
                      options={playersOptions}
                      defaultValue={filters.players}
                      onSelect={(_, values) =>
                        onFilterChange({ ...filters, players: values })
                      }
                      controlledSearch
                      onSearchChange={setDebouncedPlayersSearchValue}
                      searchValue={debouncedPlayersSearchValue}
                      loading={playersDataLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Min poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.playerLevelMin ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            playerLevelMin: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Max poziom
                      </Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={filters.playerLevelMax ?? ""}
                        onChange={(e) =>
                          onFilterChange({
                            ...filters,
                            playerLevelMax: e.target.value,
                          })
                        }
                        min={0}
                        max={500}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </div>

      <div className="border-t px-4 bg-sidebar h-14 flex items-center w-full gap-2">
        <motion.div
          whileTap={{ scale: 0.98 }}
          animate={{ width: hasActiveFilters ? "50%" : "100%" }}
          className="w-full"
        >
          <Button onClick={() => onSave()} className="w-full" size="sm">
            Zastosuj
          </Button>
        </motion.div>

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{
                opacity: 1,
                width: "50%",
                maxWidth: "50%",
              }}
              exit={{ opacity: 0, width: 0 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={onClear}
                variant="ghost"
                className="w-full"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Resetuj
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
