import { useNavigate, useSearch } from "@tanstack/react-router";
import { FilterCombobox } from "@/features/guild/loots-list/components/loots-filters/filter-combobox";
import { useLootFilterOptions } from "@/features/guild/loots-list/components/loots-filters/use-loot-filter-options";
import { useDebounceValue } from "usehooks-ts";
import {
  getNpcsControllerGetNpcsQueryKey,
  useNpcsControllerGetNpcs,
} from "@/lib/api/generated/search/npcs/npcs";
import {
  getPlayersControllerGetPlayersQueryKey,
  usePlayersControllerGetPlayers,
} from "@/lib/api/generated/search/players/players";

const DEFAULT_DEBOUNCE_MS = 500;

export const LootsFilters: React.FC = () => {
  const navigate = useNavigate();
  const { compactNpcTypeOptions, labels, rarityOptions } =
    useLootFilterOptions();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const { players, npcs, rarities, npcTypes } = searchParams;
  const selectedPlayerNames =
    players?.split(",").filter((value) => value.length > 0) ?? [];
  const selectedNpcNames =
    npcs?.split(",").filter((value) => value.length > 0) ?? [];
  const [debouncedPlayersSearchValue, setDebouncedPlayersSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const [debouncedNpcsSearchValue, setDebouncedNpcsSearchValue] =
    useDebounceValue("", DEFAULT_DEBOUNCE_MS);
  const playersSearchParams =
    debouncedPlayersSearchValue.length > 0
      ? { search: debouncedPlayersSearchValue }
      : selectedPlayerNames.length > 0
        ? { search: selectedPlayerNames }
        : undefined;
  const npcsSearchParams =
    debouncedNpcsSearchValue.length > 0
      ? { search: debouncedNpcsSearchValue }
      : selectedNpcNames.length > 0
        ? { search: selectedNpcNames }
        : undefined;
  const playersQuery = usePlayersControllerGetPlayers(playersSearchParams, {
    query: {
      queryKey: getPlayersControllerGetPlayersQueryKey(playersSearchParams),
      enabled:
        debouncedPlayersSearchValue.length > 0 ||
        selectedPlayerNames.length > 0,
    },
  });
  const npcsQuery = useNpcsControllerGetNpcs(npcsSearchParams, {
    query: {
      queryKey: getNpcsControllerGetNpcsQueryKey(npcsSearchParams),
      enabled:
        debouncedNpcsSearchValue.length > 0 || selectedNpcNames.length > 0,
    },
  });

  const handleSelect = (name: string, options: string[]) => {
    const joinedOptions = options.join(",");
    const currentParam = searchParams[name] ?? "";

    if (joinedOptions === currentParam) return;

    document.querySelector("#loots-list > div")?.scrollTo(0, 0);

    navigate({
      // @ts-expect-error - TanStack Router type inference issue with dynamic search params
      search: (prev) => ({
        ...prev,
        [name]: joinedOptions,
      }),
    });
  };

  const playersOptions =
    playersQuery.data?.map((player) => ({
      value: player.name,
      label: player.name,
    })) ?? [];

  const npcsOptions =
    npcsQuery.data?.map((npc) => ({
      value: npc.name,
      label: npc.name,
    })) ?? [];

  return (
    <div className="sticky top-0 z-10 p-4 w-full grid grid-cols-1 xs:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 bg-background gap-2 items-center border-b">
      <FilterCombobox
        name="players"
        placeholder={labels.playersPlaceholder}
        options={playersOptions}
        defaultValue={players?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label={labels.players}
        controlledSearch
        onSearchChange={setDebouncedPlayersSearchValue}
        searchValue={debouncedPlayersSearchValue}
        loading={playersQuery.isLoading}
      />
      <FilterCombobox
        name="npcs"
        placeholder={labels.npcsPlaceholder}
        options={npcsOptions}
        onSelect={handleSelect}
        defaultValue={npcs?.split(",").filter((e) => e.length > 0)}
        label={labels.npcs}
        controlledSearch
        onSearchChange={setDebouncedNpcsSearchValue}
        searchValue={debouncedNpcsSearchValue}
        loading={npcsQuery.isLoading}
      />
      <FilterCombobox
        name="rarities"
        placeholder={labels.raritiesPlaceholder}
        options={rarityOptions}
        defaultValue={rarities?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label={labels.rarities}
      />
      <FilterCombobox
        name="npcTypes"
        placeholder={labels.npcTypesPlaceholder}
        options={compactNpcTypeOptions}
        defaultValue={npcTypes?.split(",").filter((e) => e.length > 0)}
        onSelect={handleSelect}
        label={labels.npcTypes}
      />
    </div>
  );
};
