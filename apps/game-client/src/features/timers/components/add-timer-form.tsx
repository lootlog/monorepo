import React, { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateManualTimerOptions } from "@/api/timers.api";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useWindowsStore } from "@/store/windows.store";
import { parseDurationToSeconds } from "@/features/timers/helpers/add-timer-form-helpers";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
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
import { CreateManualTimerDtoType } from "@lootlog/api-client/models/main/create-manual-timer-dto-type";
import type { CreateManualTimerDto } from "@lootlog/api-client/models/main/create-manual-timer-dto";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/api-client/models/main/search-timers-npc-response-dto-output";
import {
  getTimersControllerSearchNpcsWithTimerDataQueryKey,
  useTimersControllerSearchNpcsWithTimerData,
} from "@lootlog/api-client/react-query/main/timers";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import { NPC_NAMES } from "@/constants/margonem";
import { useTranslation } from "react-i18next";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";
import { TimerFormFieldError } from "./timer-form-field-error";

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

type TimerFormTranslation = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type TimerFormValidationData = {
  endDate?: string;
  lvl?: string;
  maxDuration?: string;
  minDuration?: string;
  startDate?: string;
};

const hasText = (value?: string): value is string =>
  value !== undefined && value.length > 0;

const addValidationIssue = (
  context: z.RefinementCtx,
  message: string,
  path: keyof TimerFormValidationData,
) => {
  context.addIssue({ code: "custom", message, path: [path] });
};

const validateTimerLevel = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  if (!hasText(data.lvl)) {
    return;
  }

  const level = Number(data.lvl);
  if (
    Number.isInteger(level) &&
    level >= MIN_NPC_LEVEL &&
    level <= MAX_NPC_LEVEL
  ) {
    return;
  }

  addValidationIssue(
    context,
    t("addForm.validation.lvlRange", {
      min: MIN_NPC_LEVEL,
      max: MAX_NPC_LEVEL,
    }),
    "lvl",
  );
};

const validateTimerDurations = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  const { minDuration, maxDuration } = data;

  if (!hasText(minDuration)) {
    addValidationIssue(
      context,
      t("addForm.validation.minDurationRequired"),
      "minDuration",
    );
  } else if (parseDurationToSeconds(minDuration) <= 0) {
    addValidationIssue(
      context,
      t("addForm.validation.durationGreaterThanZero"),
      "minDuration",
    );
  }

  if (!hasText(maxDuration)) {
    addValidationIssue(
      context,
      t("addForm.validation.maxDurationRequired"),
      "maxDuration",
    );
    return;
  }

  const maxSeconds = parseDurationToSeconds(maxDuration);
  if (maxSeconds <= 0) {
    addValidationIssue(
      context,
      t("addForm.validation.durationGreaterThanZero"),
      "maxDuration",
    );
  }
  if (
    hasText(minDuration) &&
    maxSeconds < parseDurationToSeconds(minDuration)
  ) {
    addValidationIssue(
      context,
      t("addForm.validation.maxDurationMin"),
      "maxDuration",
    );
  }
};

const validateTimerDates = (
  data: TimerFormValidationData,
  context: z.RefinementCtx,
  t: TimerFormTranslation,
) => {
  const { startDate, endDate } = data;

  if (!hasText(startDate)) {
    addValidationIssue(
      context,
      t("addForm.validation.startDateRequired"),
      "startDate",
    );
  }
  if (!hasText(endDate)) {
    addValidationIssue(
      context,
      t("addForm.validation.endDateRequired"),
      "endDate",
    );
  }
  if (
    hasText(startDate) &&
    hasText(endDate) &&
    new Date(endDate) <= new Date(startDate)
  ) {
    addValidationIssue(
      context,
      t("addForm.validation.endDateAfterStart"),
      "endDate",
    );
  }
};

const formatSecondsToHHMMSS = (seconds: number): string => {
  const h = Math.floor(seconds / SECONDS_IN_HOUR);
  const m = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
  const s = seconds % SECONDS_IN_MINUTE;
  return `${h}h ${m}m ${s}s`;
};

const createFormSchema = (t: TimerFormTranslation) =>
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
      const hasMinDuration = hasText(data.minDuration);
      const hasMaxDuration = hasText(data.maxDuration);
      const hasStartDate = hasText(data.startDate);
      const hasEndDate = hasText(data.endDate);
      const usingDurations = hasMinDuration || hasMaxDuration;
      const usingDates = hasStartDate || hasEndDate;

      validateTimerLevel(data, ctx, t);

      if (!usingDurations && !usingDates) {
        addValidationIssue(
          ctx,
          t("addForm.validation.provideRespawnOrDates"),
          "minDuration",
        );
        return;
      }

      if (usingDurations) {
        validateTimerDurations(data, ctx, t);
      }

      if (usingDates) {
        validateTimerDates(data, ctx, t);
      }
    });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

type AddTimerFormProps = {
  initialGuildId?: string;
};

type GuildSelection = {
  contextKey: string;
  guildId: string;
};

const getPreferredGuildId = (
  initialGuildId: string | undefined,
  savedGuildId: string | undefined,
  currentGuildId: string | undefined,
  availableGuildIds: ReadonlySet<string>,
  firstVisibleGuildId: string | undefined,
) => {
  if (initialGuildId && availableGuildIds.has(initialGuildId)) {
    return initialGuildId;
  }
  if (savedGuildId && availableGuildIds.has(savedGuildId)) {
    return savedGuildId;
  }
  if (currentGuildId && availableGuildIds.has(currentGuildId)) {
    return currentGuildId;
  }
  return firstVisibleGuildId ?? "";
};

const resolveStoredGuildIds = (
  characterId: string,
  guildIdByCharId: Record<string, string>,
  selectedGuildIdsByCharId: Record<string, string[]>,
) => {
  if (!characterId) {
    return { currentGuildId: undefined, savedGuildId: undefined };
  }

  return {
    currentGuildId: guildIdByCharId[characterId],
    savedGuildId: selectedGuildIdsByCharId[characterId]?.[0],
  };
};

const getSelectedGuildId = (
  selection: GuildSelection | null,
  contextKey: string,
  availableGuildIds: ReadonlySet<string>,
  preferredGuildId: string,
) => {
  if (
    selection?.contextKey === contextKey &&
    availableGuildIds.has(selection.guildId)
  ) {
    return selection.guildId;
  }
  return preferredGuildId;
};

const shouldShowNoNpcResults = ({
  debouncedSearch,
  hasSearchResults,
  isFailed,
  isLoading,
  showSuggestions,
}: {
  debouncedSearch: string;
  hasSearchResults: boolean;
  isFailed: boolean;
  isLoading: boolean;
  showSuggestions: boolean;
}) =>
  showSuggestions &&
  debouncedSearch.length >= 2 &&
  !hasSearchResults &&
  !isLoading &&
  !isFailed;

const getSelectedNpcType = (npcType: FormValues["type"]) =>
  npcType || EMPTY_NPC_TYPE_VALUE;

const getFieldErrorMessage = (error?: { message?: string }) => error?.message;

const getNpcSearchParams = (world: string | undefined, search: string) => ({
  limit: 10,
  search,
  world: world ?? "",
});

export const AddTimerForm: React.FC<AddTimerFormProps> = ({
  initialGuildId,
}) => {
  const { t } = useTranslation("timers");
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const world = useGameStore((state) => state.game?.world ?? "unknown");
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const { selectedGuildIdsForTimersByCharId, guildIdByCharId } =
    useSettingsStore();
  const setOpen = useWindowsStore((state) => state.setOpen);
  const { visibleGuilds } = useVisibleLootlogGuilds();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customDatesEnabled, setCustomDatesEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedGuildSelection, setSelectedGuildSelection] =
    useState<GuildSelection | null>(null);
  const [selectedNpc, setSelectedNpc] =
    useState<SearchTimersNpcResponseDtoOutput | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { currentGuildId, savedGuildId } = resolveStoredGuildIds(
    characterId,
    guildIdByCharId,
    selectedGuildIdsForTimersByCharId,
  );
  const guildSelectionContextKey = `${characterId}:${initialGuildId ?? ""}:${savedGuildId ?? ""}`;
  const availableGuildIds = new Set(visibleGuilds.map((guild) => guild.id));
  const preferredGuildId = getPreferredGuildId(
    initialGuildId,
    savedGuildId,
    currentGuildId,
    availableGuildIds,
    visibleGuilds[0]?.id,
  );
  const selectedGuildId = getSelectedGuildId(
    selectedGuildSelection,
    guildSelectionContextKey,
    availableGuildIds,
    preferredGuildId,
  );

  const searchGuildId = selectedGuildId;
  const npcSearchParams = getNpcSearchParams(world, debouncedSearch);

  const {
    data: npcResults,
    isError: npcSearchFailed,
    isFetching: npcSearchLoading,
    refetch: retryNpcSearch,
  } = useTimersControllerSearchNpcsWithTimerData(
    { guildId: searchGuildId },
    npcSearchParams,
    {
      query: {
        queryKey: getTimersControllerSearchNpcsWithTimerDataQueryKey(
          { guildId: searchGuildId },
          getNpcSearchParams(world, debouncedSearch),
        ),
        enabled: debouncedSearch.length >= 2 && !!searchGuildId,
        staleTime: 60000,
      },
    },
  );

  const handleGuildSelectionChange = (guildId: string) => {
    setSelectedGuildSelection({
      contextKey: guildSelectionContextKey,
      guildId,
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    control,
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
    if (e.nativeEvent.isComposing) return;
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

  const [startDate, endDate, watchedNpcType] = useWatch({
    control,
    name: ["startDate", "endDate", "type"],
  });
  const selectedNpcType = getSelectedNpcType(watchedNpcType);
  const nameField = register("name");

  const hasSearchResults = Boolean(npcResults?.length);
  const showNoResults = shouldShowNoNpcResults({
    debouncedSearch,
    hasSearchResults,
    isFailed: npcSearchFailed,
    isLoading: npcSearchLoading,
    showSuggestions,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="ll:flex ll:flex-col ll:h-full ll:box-border ll:overflow-hidden ll:w-full"
    >
      {visibleGuilds.length !== 1 && (
        <div className="ll:shrink-0 ll:pt-1 ll:pb-2">
          {visibleGuilds.length > 1 && <Label>{t("addForm.guildLabel")}</Label>}
          <GuildSwitcher
            value={selectedGuildId}
            onChange={handleGuildSelectionChange}
            disabled={isPending}
          />
        </div>
      )}

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
                  setSelectedIndex(-1);
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
                errorMessage={
                  showSuggestions && npcSearchFailed
                    ? t("addForm.npcSearchError")
                    : undefined
                }
                isLoading={showSuggestions && npcSearchLoading}
                isOpen={showSuggestions && !!hasSearchResults}
                loadingMessage={t("addForm.npcSearching")}
                onRetry={() => {
                  void retryNpcSearch();
                }}
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
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.name)}
              />
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
                <TimerFormFieldError
                  message={getFieldErrorMessage(errors.lvl)}
                />
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
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.minDuration)}
              />
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
              <TimerFormFieldError
                message={getFieldErrorMessage(errors.maxDuration)}
              />
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
                  <TimerFormFieldError
                    message={getFieldErrorMessage(errors.startDate)}
                  />
                </div>
                <div className="ll:w-full ll:box-border">
                  <Label htmlFor="endDate">{t("addForm.endDateLabel")}</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    {...register("endDate")}
                    className="ll:text-xs"
                  />
                  <TimerFormFieldError
                    message={getFieldErrorMessage(errors.endDate)}
                  />
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
