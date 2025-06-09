import { NpcType, useNpcs } from "@/hooks/api/use-npcs";
import { useGuildPlayers } from "@/hooks/api/use-guild-players";
import { useSearchParams } from "react-router-dom";
import { FilterCombobox } from "@/screens/guild/components/loots-filters/filter-combobox";
import { useDebounceValue } from "usehooks-ts";
import { ItemRarity } from "@/hooks/api/use-loots";

const raritiesData = [
  { value: ItemRarity.LEGENDARY, label: "Legendarny" },
  { value: ItemRarity.HEROIC, label: "Heroiczny" },
  { value: ItemRarity.UNIQUE, label: "Unikatowy" },
];

const npcTypesData = [
  { value: NpcType.NPC, label: "NPC" },
  { value: NpcType.COLOSSUS, label: "Kolos" },
  { value: NpcType.TITAN, label: "Tytan" },
  { value: NpcType.HERO, label: "Heros" },
  { value: NpcType.ELITE3, label: "Elita III" },
  { value: NpcType.ELITE2, label: "Elita II" },
  { value: NpcType.ELITE, label: "Elita" },
];

const DEFAULT_DEBOUNCE_MS = 500;

export const LootsFilters: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { players, npcs, rarities, npcTypes } = Object.fromEntries(
    searchParams.entries()
  );
  const [debouncedPlayersSearchValue, setDebouncedPlayersSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const [debouncedNpcsSearchValue, setDebouncedNpcsSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const { data: playersData, isLoading: playersDataLoading } = useGuildPlayers({
    search: debouncedPlayersSearchValue,
    selectedPlayers: players,
  });
  const { data: npcsData, isLoading: npcsDataLoading } = useNpcs({
    search: debouncedNpcsSearchValue,
    selectedNpcs: npcs,
  });

  const handleSelect = async (name: string, options: string[]) => {
    const joinedOptions = options.join(",");
    const currentParam = searchParams.get(name) ?? "";

    if (joinedOptions === currentParam) return;

    searchParams.set(name, joinedOptions);
    document.querySelector("#loots-list > div")?.scrollTo(0, 0);

    setSearchParams(searchParams);
  };

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

  return (
    <div className="p-4 w-full grid grid-cols-1 xs:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4  gap-2 items-center border-b">
      <FilterCombobox
        name="players"
        placeholder="Wybierz graczy"
        options={playersOptions}
        defaultValue={players?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label="Gracze"
        controlledSearch
        onSearchChange={setDebouncedPlayersSearchValue}
        searchValue={debouncedPlayersSearchValue}
        loading={playersDataLoading}
      />
      <FilterCombobox
        name="npcs"
        placeholder="Wybierz potwory"
        options={npcsOptions}
        onSelect={handleSelect}
        defaultValue={npcs?.split(",").filter((e) => e.length > 0)}
        label="Potwory"
        controlledSearch
        onSearchChange={setDebouncedNpcsSearchValue}
        searchValue={debouncedNpcsSearchValue}
        loading={npcsDataLoading}
      />
      <FilterCombobox
        name="rarities"
        placeholder="Wybierz rzadkość"
        options={raritiesData}
        defaultValue={rarities?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label="Rzadkość przedmiotu"
      />
      <FilterCombobox
        name="npcTypes"
        placeholder="Wybierz typ potwora"
        options={npcTypesData}
        defaultValue={npcTypes?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label="Typ potwora"
      />
    </div>
  );
};
