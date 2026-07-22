import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateManualTimerOptions } from "@/api/timers.api";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useWindowsStore } from "@/store/windows.store";
import { parseDurationToSeconds } from "@/features/timers/helpers/add-timer-form-helpers";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";
import { useSettingsStore } from "@/store/settings.store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { GuildSwitcher } from "@/components/guild-switcher";
import {
  CreateManualTimerDtoType,
  type CreateManualTimerDto,
  type SearchTimersNpcResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import {
  getTimersControllerSearchNpcsWithTimerDataQueryKey,
  useTimersControllerSearchNpcsWithTimerData,
} from "@/lib/api/generated/main/timers/timers";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { NPC_NAMES } from "@/constants/margonem";
import { Game } from "@/lib/game";
import { useTranslation } from "react-i18next";

const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

const MAX_NPC_NAME_LENGTH = 50;
const MIN_NPC_LEVEL = 1;
const MAX_NPC_LEVEL = 500;
const EMPTY_NPC_TYPE_VALUE = "none";
const MANUAL_TIMER_NPC_TYPES = [
  CreateManualTimerDtoType.ELITE2,
  CreateManualTimerDtoType.ELITE3,
  CreateManualTimerDtoType.HERO,
  CreateManualTimerDtoType.TITAN,
] as const satisfies readonly NonNullable<CreateManualTimerDto["type"]>[];
const manualTimerNpcTypeSet = new Set<string>(MANUAL_TIMER_NPC_TYPES);
const MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS = {
  [CreateManualTimerDtoType.ELITE2]: "elite2",
  [CreateManualTimerDtoType.ELITE3]: "elite3",
  [CreateManualTimerDtoType.HERO]: "hero",
  [CreateManualTimerDtoType.TITAN]: "titan",
} as const satisfies Record<(typeof MANUAL_TIMER_NPC_TYPES)[number], string>;

const formatSecondsToHHMMSS = (seconds: number): string => {
  const h = Math.floor(seconds / SECONDS_IN_HOUR);
  const m = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
  const s = seconds % SECONDS_IN_MINUTE;
  return `${h}h ${m}m ${s}s`;
};

const createFormSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
) =>
  z
    .object({
      name: z
        .string()
        .min(1, t("addForm.validation.nameRequired"))
        .max(
          MAX_NPC_NAME_LENGTH,
          t("addForm.validation.nameMax", { max: MAX_NPC_NAME_LENGTH }),
        ),
      minDuration: z.string().optional(),
      maxDuration: z.string().optional(),
      lvl: z.string().optional(),
      type: z
        .enum([
          CreateManualTimerDtoType.ELITE2,
          CreateManualTimerDtoType.ELITE3,
          CreateManualTimerDtoType.HERO,
          CreateManualTimerDtoType.TITAN,
        ])
        .or(z.literal(""))
        .optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const hasMinDuration = data.minDuration && data.minDuration.length > 0;
      const hasMaxDuration = data.maxDuration && data.maxDuration.length > 0;
      const hasStartDate = data.startDate && data.startDate.length > 0;
      const hasEndDate = data.endDate && data.endDate.length > 0;
      const hasLvl = data.lvl && data.lvl.length > 0;

      const usingDurations = hasMinDuration || hasMaxDuration;
      const usingDates = hasStartDate || hasEndDate;

      if (hasLvl && data.lvl) {
        const lvl = Number(data.lvl);
        if (
          !Number.isInteger(lvl) ||
          lvl < MIN_NPC_LEVEL ||
          lvl > MAX_NPC_LEVEL
        ) {
          ctx.addIssue({
            code: "custom",
            message: t("addForm.validation.lvlRange", {
              min: MIN_NPC_LEVEL,
              max: MAX_NPC_LEVEL,
            }),
            path: ["lvl"],
          });
        }
      }

      if (!usingDurations && !usingDates) {
        ctx.addIssue({
          code: "custom",
          message: t("addForm.validation.provideRespawnOrDates"),
          path: ["minDuration"],
        });
        return;
      }

      if (usingDurations) {
        if (!hasMinDuration) {
          ctx.addIssue({
            code: "custom",
            message: t("addForm.validation.minDurationRequired"),
            path: ["minDuration"],
          });
        } else if (data.minDuration) {
          const minSeconds = parseDurationToSeconds(data.minDuration);
          if (minSeconds <= 0) {
            ctx.addIssue({
              code: "custom",
              message: t("addForm.validation.durationGreaterThanZero"),
              path: ["minDuration"],
            });
          }
        }

        if (!hasMaxDuration) {
          ctx.addIssue({
            code: "custom",
            message: t("addForm.validation.maxDurationRequired"),
            path: ["maxDuration"],
          });
        } else if (data.maxDuration) {
          const maxSeconds = parseDurationToSeconds(data.maxDuration);
          if (maxSeconds <= 0) {
            ctx.addIssue({
              code: "custom",
              message: t("addForm.validation.durationGreaterThanZero"),
              path: ["maxDuration"],
            });
          }

          if (hasMinDuration && data.minDuration) {
            const minSeconds = parseDurationToSeconds(data.minDuration);
            if (maxSeconds < minSeconds) {
              ctx.addIssue({
                code: "custom",
                message: t("addForm.validation.maxDurationMin"),
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
            message: t("addForm.validation.startDateRequired"),
            path: ["startDate"],
          });
        }

        if (!hasEndDate) {
          ctx.addIssue({
            code: "custom",
            message: t("addForm.validation.endDateRequired"),
            path: ["endDate"],
          });
        }

        if (hasStartDate && hasEndDate && data.startDate && data.endDate) {
          const startTime = new Date(data.startDate);
          const endTime = new Date(data.endDate);
          if (endTime <= startTime) {
            ctx.addIssue({
              code: "custom",
              message: t("addForm.validation.endDateAfterStart"),
              path: ["endDate"],
            });
          }
        }
      }
    });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

type AddTimerFormProps = {
  initialGuildId?: string;
};

export const AddTimerForm: React.FC<AddTimerFormProps> = ({
  initialGuildId,
}) => {
  const { t } = useTranslation("timers");
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const world = Game.getWorldName();
  const characterId = String(Game.hero.id);
  const { selectedGuildIdsForTimersByCharId, guildIdByCharId } =
    useSettingsStore();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customDatesEnabled, setCustomDatesEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [selectedNpc, setSelectedNpc] =
    useState<SearchTimersNpcResponseDtoOutput | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const currentGuildId = characterId ? guildIdByCharId[characterId] : undefined;

  const searchGuildId = selectedGuildId || currentGuildId || "";

  const { data: npcResults } = useTimersControllerSearchNpcsWithTimerData(
    { guildId: searchGuildId },
    {
      limit: 10,
      search: debouncedSearch,
      world: world ?? "",
    },
    {
      query: {
        queryKey: getTimersControllerSearchNpcsWithTimerDataQueryKey(
          { guildId: searchGuildId },
          {
            world: world ?? "",
            search: debouncedSearch,
            limit: 10,
          },
        ),
        enabled: debouncedSearch.length >= 2 && !!searchGuildId,
        staleTime: 60000,
      },
    },
  );

  useEffect(() => {
    if (!characterId || !guilds || guilds.length === 0) return;

    const savedGuildIds = selectedGuildIdsForTimersByCharId[characterId] || [];
    const savedGuildId = savedGuildIds[0];

    const isValidInitialGuild =
      initialGuildId && guilds.some((guild) => guild.id === initialGuildId);

    const isValidSavedGuild =
      savedGuildId && guilds.some((guild) => guild.id === savedGuildId);

    if (isValidInitialGuild) {
      setSelectedGuildId(initialGuildId);
    } else if (isValidSavedGuild) {
      setSelectedGuildId(savedGuildId);
    } else if (
      currentGuildId &&
      guilds.some((guild) => guild.id === currentGuildId)
    ) {
      setSelectedGuildId(currentGuildId);
    } else {
      setSelectedGuildId(guilds[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, initialGuildId, selectedGuildIdsForTimersByCharId, guilds]);

  const handleGuildSelectionChange = (guildId: string) => {
    setSelectedGuildId(guildId);
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      name: "",
      minDuration: "",
      maxDuration: "",
      lvl: "",
      type: "",
      startDate: "",
      endDate: "",
    },
  });

  const handleNpcSelect = (npc: SearchTimersNpcResponseDtoOutput) => {
    const baseSeconds = npc.latestRespBaseSeconds ?? 0;
    const respawnRandomness =
      npc.latestRespawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS;
    const variance = Math.round((baseSeconds * respawnRandomness) / 100);
    const minSeconds = Math.max(baseSeconds - variance, 0);
    const maxSeconds = baseSeconds + variance;

    setValue("name", npc.name);
    setValue("minDuration", formatSecondsToHHMMSS(minSeconds));
    setValue("maxDuration", formatSecondsToHHMMSS(maxSeconds));
    setValue("lvl", String(npc.lvl));
    setValue(
      "type",
      manualTimerNpcTypeSet.has(npc.type)
        ? (npc.type as NonNullable<CreateManualTimerDto["type"]>)
        : "",
    );
    setSelectedNpc(npc);
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

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const onSubmit = (data: FormValues) => {
    if (!world || !selectedGuildId) return;

    const timerData: CreateManualTimerOptions = {
      name: data.name,
      world,
      guildIds: [selectedGuildId],
    };

    if (data.lvl && data.lvl.length > 0) {
      timerData.lvl = Number(data.lvl);
    }

    if (data.type) {
      timerData.type = data.type;
    }

    if (selectedNpc && selectedNpc.name === data.name) {
      timerData.prof = selectedNpc.prof;
    }

    if (customDatesEnabled && data.startDate && data.endDate) {
      timerData.customMinSpawnTime = new Date(data.startDate);
      timerData.customMaxSpawnTime = new Date(data.endDate);
    } else if (data.minDuration && data.maxDuration) {
      timerData.minSeconds = parseDurationToSeconds(data.minDuration);
      timerData.maxSeconds = parseDurationToSeconds(data.maxDuration);
    }

    createManualTimer(timerData, {
      onSuccess: () => {
        setOpen("add-timer", false);
      },
    });
  };

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const selectedNpcType = watch("type") || EMPTY_NPC_TYPE_VALUE;
  const nameField = register("name");

  const hasSearchResults = npcResults && npcResults.length > 0;
  const showNoResults =
    showSuggestions && debouncedSearch.length >= 2 && !hasSearchResults;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:flex-col ll:h-full ll:box-border ll:overflow-hidden ll:w-full"
    >
      <div className="ll:shrink-0 ll:pt-1 ll:pb-2">
        <Label>{t("addForm.guildLabel")}</Label>
        <GuildSwitcher
          value={selectedGuildId}
          onChange={handleGuildSelectionChange}
          disabled={isPending}
        />
        {!selectedGuildId && (
          <p className="ll:text-xs ll:text-red-500 ll:mt-1">
            {t("addForm.guildRequired")}
          </p>
        )}
      </div>

      <div className="ll:min-h-0 ll:flex-1 ll:overflow-hidden">
        <ScrollArea
          data-testid="add-timer-scroll-container"
          className="ll:h-full ll:w-full"
        >
          <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:px-1 ll:box-border">
            <div className="ll:relative ll:w-full ll:box-border">
              <Label htmlFor="npcSearch">{t("addForm.searchNpcLabel")}</Label>
              <Input
                id="npcSearch"
                autoComplete="off"
                placeholder={t("addForm.searchNpcPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedNpc(null);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleSearchKeyDown}
                onBlur={() => {
                  if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current);
                  }

                  blurTimeoutRef.current = setTimeout(() => {
                    setShowSuggestions(false);
                    blurTimeoutRef.current = null;
                  }, 200);
                }}
              />
              <AutocompleteSuggestions<SearchTimersNpcResponseDtoOutput>
                items={npcResults ?? []}
                isOpen={showSuggestions && !!hasSearchResults}
                onSelect={handleNpcSelect}
                selectedIndex={selectedIndex}
                keyExtractor={(npc) => npc.npcId}
                renderItem={(npc, _index, isSelected) => {
                  const longname =
                    NPC_NAMES[npc.type]?.longname ?? t("addForm.mobFallback");
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
                noResultsMessage={t("addForm.npcNotFound")}
                showNoResults={showNoResults}
              />
            </div>

            <div className="ll:w-full ll:box-border">
              <Label htmlFor="name">{t("addForm.nameLabel")}</Label>
              <Input
                id="name"
                autoComplete="off"
                placeholder={t("addForm.namePlaceholder")}
                maxLength={MAX_NPC_NAME_LENGTH}
                {...nameField}
                onChange={(event) => {
                  setSelectedNpc(null);
                  nameField.onChange(event);
                }}
              />
              {errors.name && (
                <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="ll:grid ll:grid-cols-1 ll:gap-2 ll:sm:grid-cols-2 ll:w-full ll:box-border">
              <div className="ll:min-w-0">
                <Label htmlFor="lvl">{t("addForm.lvlLabel")}</Label>
                <Input
                  id="lvl"
                  type="number"
                  min={MIN_NPC_LEVEL}
                  max={MAX_NPC_LEVEL}
                  step={1}
                  autoComplete="off"
                  placeholder={t("addForm.lvlPlaceholder")}
                  {...register("lvl")}
                />
                {errors.lvl && (
                  <p className="ll:text-xs ll:text-red-500 ll:mt-1">
                    {errors.lvl.message}
                  </p>
                )}
              </div>
              <div className="ll:min-w-0">
                <Label htmlFor="npcType">{t("addForm.typeLabel")}</Label>
                <Select
                  value={selectedNpcType}
                  onValueChange={(value) => {
                    setValue(
                      "type",
                      value === EMPTY_NPC_TYPE_VALUE
                        ? ""
                        : (value as NonNullable<CreateManualTimerDto["type"]>),
                    );
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="npcType"
                    aria-label={t("addForm.typeLabel")}
                  >
                    <SelectValue placeholder={t("addForm.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_NPC_TYPE_VALUE}>
                      {t("addForm.typePlaceholder")}
                    </SelectItem>
                    {MANUAL_TIMER_NPC_TYPES.map((npcType) => (
                      <SelectItem key={npcType} value={npcType}>
                        {t(
                          `common:npcTypes.${MANUAL_TIMER_NPC_TYPE_TRANSLATION_KEYS[npcType]}`,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="ll:w-full ll:box-border">
              <Label htmlFor="minDuration">
                {t("addForm.minDurationLabel")}
              </Label>
              <Input
                id="minDuration"
                placeholder={t("addForm.minDurationPlaceholder")}
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
              <Label htmlFor="maxDuration">
                {t("addForm.maxDurationLabel")}
              </Label>
              <Input
                id="maxDuration"
                placeholder={t("addForm.maxDurationPlaceholder")}
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
                onChange={(e) =>
                  handleCustomDatesToggle(e.currentTarget.checked)
                }
              >
                {t("addForm.customDates")}
              </Checkbox>
            </div>

            {customDatesEnabled && (
              <div className="ll:flex ll:flex-col ll:gap-2 ll:w-full ll:box-border">
                <div className="ll:w-full ll:box-border">
                  <Label htmlFor="startDate">
                    {t("addForm.startDateLabel")}
                  </Label>
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
                  <Label htmlFor="endDate">{t("addForm.endDateLabel")}</Label>
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
                    {t("addForm.windowLabel")}{" "}
                    {new Date(endDate).getTime() -
                      new Date(startDate).getTime() >
                    0
                      ? `${Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000)}m`
                      : t("addForm.invalidRange")}
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="ll:flex ll:justify-center ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1 ll:shrink-0">
        <button
          type="submit"
          className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4"
          disabled={isPending || !selectedGuildId}
        >
          {isPending ? t("addForm.submitting") : t("addForm.submit")}
        </button>
      </div>
    </form>
  );
};
