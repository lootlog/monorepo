import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateManualTimer,
  type UseCreateManualTimerOptions,
} from "@/hooks/api/use-create-manual-timer";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { parseDurationToSeconds } from "@/features/timers/helpers/add-timer-form-helpers";
import { useSettingsStore } from "@/store/settings.store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSearchNpcs,
  type NpcSearchResult,
} from "@/hooks/api/use-search-npcs";
import { useDebounce } from "@/hooks/use-debounce";
import { GuildMultiSelector } from "@/components/guild-multi-selector";
import { useGuilds } from "@/hooks/api/use-guilds";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { NPC_NAMES } from "@/constants/margonem";

const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

const formatSecondsToHHMMSS = (seconds: number): string => {
  const h = Math.floor(seconds / SECONDS_IN_HOUR);
  const m = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
  const s = seconds % SECONDS_IN_MINUTE;
  return `${h}h ${m}m ${s}s`;
};

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nazwa jest wymagana")
      .max(20, "Nazwa może mieć maksymalnie 20 znaków"),
    minDuration: z.string().optional(),
    maxDuration: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasMinDuration = data.minDuration && data.minDuration.length > 0;
    const hasMaxDuration = data.maxDuration && data.maxDuration.length > 0;
    const hasStartDate = data.startDate && data.startDate.length > 0;
    const hasEndDate = data.endDate && data.endDate.length > 0;

    const usingDurations = hasMinDuration || hasMaxDuration;
    const usingDates = hasStartDate || hasEndDate;

    if (!usingDurations && !usingDates) {
      ctx.addIssue({
        code: "custom",
        message: "Podaj czasy respawnu lub niestandardowe daty",
        path: ["minDuration"],
      });
      return;
    }

    if (usingDurations) {
      if (!hasMinDuration) {
        ctx.addIssue({
          code: "custom",
          message: "Minimalny czas jest wymagany",
          path: ["minDuration"],
        });
      } else if (data.minDuration) {
        const minSeconds = parseDurationToSeconds(data.minDuration);
        if (minSeconds <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "Czas musi być większy niż 0 sekund",
            path: ["minDuration"],
          });
        }
      }

      if (!hasMaxDuration) {
        ctx.addIssue({
          code: "custom",
          message: "Maksymalny czas jest wymagany",
          path: ["maxDuration"],
        });
      } else if (data.maxDuration) {
        const maxSeconds = parseDurationToSeconds(data.maxDuration);
        if (maxSeconds <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "Czas musi być większy niż 0 sekund",
            path: ["maxDuration"],
          });
        }

        if (hasMinDuration && data.minDuration) {
          const minSeconds = parseDurationToSeconds(data.minDuration);
          if (maxSeconds < minSeconds) {
            ctx.addIssue({
              code: "custom",
              message: "Maksymalny czas musi być większy lub równy minimalnemu",
              path: ["maxDuration"],
            });
          }
        }
      }
    }

    if (usingDates) {
      if (!hasStartDate) {
        ctx.addIssue({
          code: "custom",
          message: "Data startu jest wymagana",
          path: ["startDate"],
        });
      }

      if (!hasEndDate) {
        ctx.addIssue({
          code: "custom",
          message: "Data końca jest wymagana",
          path: ["endDate"],
        });
      }

      if (hasStartDate && hasEndDate && data.startDate && data.endDate) {
        const startTime = new Date(data.startDate);
        const endTime = new Date(data.endDate);
        if (endTime <= startTime) {
          ctx.addIssue({
            code: "custom",
            message: "Data końca musi być późniejsza niż data startu",
            path: ["endDate"],
          });
        }
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export const AddTimerForm: React.FC = () => {
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const { world, characterId } = useGlobalStore((state) => state.gameState);
  const {
    selectedGuildIdsForTimersByCharId,
    setSelectedGuildIdsForTimers,
    guildIdByCharId,
  } = useSettingsStore();
  const { setOpen } = useWindowsStore();
  const { data: guilds } = useGuilds();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customDatesEnabled, setCustomDatesEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const currentGuildId = characterId ? guildIdByCharId[characterId] : undefined;

  const { data: npcResults } = useSearchNpcs(
    currentGuildId ?? "",
    world ?? "",
    debouncedSearch,
    debouncedSearch.length >= 2 && !!currentGuildId,
  );

  useEffect(() => {
    if (!characterId || !guilds) return;

    const savedGuildIds = selectedGuildIdsForTimersByCharId[characterId] || [];
    if (savedGuildIds.length > 0) {
      const validGuildIds = savedGuildIds.filter((id: string) =>
        guilds.some((guild) => guild.id === id),
      );
      setSelectedGuildIds(validGuildIds);
    } else if (currentGuildId) {
      setSelectedGuildIds([currentGuildId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, selectedGuildIdsForTimersByCharId, guilds]);

  const handleGuildSelectionChange = (guildIds: string[]) => {
    setSelectedGuildIds(guildIds);
    if (characterId) {
      setSelectedGuildIdsForTimers(characterId, guildIds);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      minDuration: "",
      maxDuration: "",
      startDate: "",
      endDate: "",
    },
  });

  const handleNpcSelect = (npc: NpcSearchResult) => {
    setValue("name", npc.name);
    setValue("minDuration", formatSecondsToHHMMSS(npc.latestRespBaseSeconds));
    const maxSeconds = Math.round(
      npc.latestRespBaseSeconds +
        (npc.latestRespBaseSeconds * npc.latestRespawnRandomness) / 100,
    );
    setValue("maxDuration", formatSecondsToHHMMSS(maxSeconds));
    setSearchQuery("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleCustomDatesToggle = (enabled: boolean) => {
    setCustomDatesEnabled(enabled);
    if (enabled) {
      setValue("minDuration", "");
      setValue("maxDuration", "");
    } else {
      setValue("startDate", "");
      setValue("endDate", "");
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!npcResults || npcResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < npcResults.length - 1 ? prev + 1 : prev,
      );
      setShowSuggestions(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      setShowSuggestions(true);
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleNpcSelect(npcResults[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedSearch]);

  const onSubmit = (data: FormValues) => {
    if (!world || selectedGuildIds.length === 0) return;

    const timerData: UseCreateManualTimerOptions = {
      name: data.name,
      respBaseSeconds: 0,
      respawnRandomness: 0,
      world,
      guildIds: selectedGuildIds,
    };

    if (customDatesEnabled && data.startDate && data.endDate) {
      timerData.customMinSpawnTime = new Date(data.startDate);
      timerData.customMaxSpawnTime = new Date(data.endDate);
      timerData.respBaseSeconds = 1;
      timerData.respawnRandomness = 0;
    } else if (data.minDuration && data.maxDuration) {
      const minSeconds = parseDurationToSeconds(data.minDuration);
      const maxSeconds = parseDurationToSeconds(data.maxDuration);
      timerData.respBaseSeconds = minSeconds;
      timerData.respawnRandomness =
        maxSeconds > minSeconds
          ? Math.round(((maxSeconds - minSeconds) / minSeconds) * 100)
          : 0;
    }

    createManualTimer(timerData, {
      onSuccess: () => {
        setOpen("add-timer", false);
      },
    });
  };

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  const hasSearchResults = npcResults && npcResults.length > 0;
  const showNoResults =
    showSuggestions && debouncedSearch.length >= 2 && !hasSearchResults;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:flex-col ll:h-full ll:box-border ll:overflow-hidden"
    >
      <ScrollArea className="ll:flex-1 ll:mt-2 ll:mb-2">
        <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:px-1 ll:box-border">
          <div className="ll:w-full ll:box-border">
            <Label>Serwery</Label>
            <GuildMultiSelector
              value={selectedGuildIds}
              onChange={handleGuildSelectionChange}
              disabled={isPending}
            />
            {selectedGuildIds.length === 0 && (
              <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                Wybierz przynajmniej jeden serwer
              </p>
            )}
          </div>

          <div className="ll:relative ll:w-full ll:box-border">
            <Label htmlFor="npcSearch">Szukaj potwora</Label>
            <Input
              id="npcSearch"
              autoComplete="off"
              placeholder="Wpisz nazwę potwora..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            <AutocompleteSuggestions<NpcSearchResult>
              items={npcResults ?? []}
              isOpen={showSuggestions && !!hasSearchResults}
              onSelect={handleNpcSelect}
              selectedIndex={selectedIndex}
              keyExtractor={(npc) => npc.npcId}
              renderItem={(npc, _index, isSelected) => {
                const longname = NPC_NAMES[npc.type]?.longname ?? "mob";
                const npcDetails =
                  npc.lvl > 0 && npc.prof
                    ? ` ${npc.lvl}${npc.prof.charAt(0).toLowerCase()}`
                    : "";

                return (
                  <div
                    className={`ll:px-3 ll:py-2 ll:text-xs ll:border-b ll:border-gray-600/50 last:ll:border-b-0 ${
                      isSelected
                        ? "ll:bg-blue-500/30"
                        : "ll:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="ll:font-semibold ll:text-white">
                      {npc.name}
                    </div>
                    <div className="ll:text-gray-400 ll:text-[10px]">
                      {longname} • {npcDetails}
                    </div>
                  </div>
                );
              }}
              noResultsMessage="Nie znaleziono potwora"
              showNoResults={showNoResults}
            />
          </div>

          <div className="ll:w-full ll:box-border">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              autoComplete="off"
              placeholder="np. Młody Smok"
              maxLength={20}
              {...register("name")}
            />
            {errors.name && (
              <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="ll:w-full ll:box-border">
            <Label htmlFor="minDuration">Minimalny czas (max 300h)</Label>
            <Input
              id="minDuration"
              placeholder="np. 2h 30m 45s"
              autoComplete="off"
              disabled={customDatesEnabled}
              {...register("minDuration")}
            />
            {errors.minDuration && (
              <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                {errors.minDuration.message}
              </p>
            )}
          </div>

          <div className="ll:w-full ll:box-border">
            <Label htmlFor="maxDuration">Maksymalny czas (max 300h)</Label>
            <Input
              id="maxDuration"
              placeholder="np. 3h 15m 30s"
              autoComplete="off"
              disabled={customDatesEnabled}
              {...register("maxDuration")}
            />
            {errors.maxDuration && (
              <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                {errors.maxDuration.message}
              </p>
            )}
          </div>

          <div className="ll:mt-2">
            <Checkbox
              id="customDates"
              checked={customDatesEnabled}
              onChange={(e) => handleCustomDatesToggle(e.currentTarget.checked)}
            >
              Niestandardowe daty spawnu
            </Checkbox>
          </div>

          {customDatesEnabled && (
            <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:box-border">
              <div className="ll:w-full ll:box-border">
                <Label htmlFor="startDate">Data startu</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...register("startDate")}
                  className="ll:text-xs"
                />
                {errors.startDate && (
                  <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="ll:w-full ll:box-border">
                <Label htmlFor="endDate">Data końca</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...register("endDate")}
                  className="ll:text-xs"
                />
                {errors.endDate && (
                  <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
              {startDate && endDate && (
                <p className="ll:text-xs ll:text-gray-400">
                  Okno:{" "}
                  {new Date(endDate).getTime() - new Date(startDate).getTime() >
                  0
                    ? `${Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000)}m`
                    : "Nieprawidłowy zakres"}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="ll:flex ll:justify-center ll:border-t ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1">
        <button
          type="submit"
          className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4"
          disabled={isPending || selectedGuildIds.length === 0}
        >
          {isPending ? "Dodawanie..." : "Dodaj"}
        </button>
      </div>
    </form>
  );
};
