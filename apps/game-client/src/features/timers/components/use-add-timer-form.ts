import React, { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateManualTimerOptions } from "@/api/timers.api";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useWindowsStore } from "@/store/windows.store";
import { parseDurationToSeconds } from "@/features/timers/helpers/add-timer-form-helpers";
import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  CreateManualTimerDtoType,
  type CreateManualTimerDto,
  type SearchTimersNpcResponseDtoOutput,
  getTimersControllerSearchNpcsWithTimerDataQueryKey,
  useTimersControllerSearchNpcsWithTimerData,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { useVisibleLootlogGuilds } from "@/hooks/use-visible-lootlog-guilds";

const SECONDS_IN_HOUR = 3600;

const SECONDS_IN_MINUTE = 60;

export const MAX_NPC_NAME_LENGTH = 50;

export const MIN_NPC_LEVEL = 1;

export const MAX_NPC_LEVEL = 500;

export const EMPTY_NPC_TYPE_VALUE = "none";

export const MANUAL_TIMER_NPC_TYPES = [
  CreateManualTimerDtoType.ELITE2,
  CreateManualTimerDtoType.ELITE3,
  CreateManualTimerDtoType.HERO,
  CreateManualTimerDtoType.TITAN,
] as const satisfies readonly NonNullable<CreateManualTimerDto["type"]>[];

export const resolveManualTimerNpcType = (value: string) =>
  MANUAL_TIMER_NPC_TYPES.find((npcType) => npcType === value) ?? "";

type TimerFormTranslation = (
  key: string,
  options?: { min?: number; max?: number },
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

export type AddTimerFormProps = {
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

const getNpcSearchParams = (world: string | undefined, search: string) => ({
  limit: 10,
  search,
  world: world ?? "",
});

export function useAddTimerForm({ initialGuildId }: AddTimerFormProps) {
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

  const selectedNpcRef = useRef<SearchTimersNpcResponseDtoOutput | null>(null);
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
    setValue("type", resolveManualTimerNpcType(npc.type));
    selectedNpcRef.current = npc;
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

  // Cleanup intentionally reads the latest timer handle, not a DOM node or the initial null value.
  // oxlint-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    return () => {
      // This mutable timer handle must cancel the latest scheduled blur, not the mount-time value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (blurTimeoutRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (selectedNpcRef.current?.name === data.name) {
      timerData.prof = selectedNpcRef.current.prof;
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

  return {
    t,
    isPending,
    visibleGuilds,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
    customDatesEnabled,
    selectedIndex,
    setSelectedIndex,
    selectedNpcRef,
    blurTimeoutRef,
    selectedGuildId,
    npcResults,
    npcSearchFailed,
    npcSearchLoading,
    retryNpcSearch,
    handleGuildSelectionChange,
    register,
    handleSubmit,
    setValue,
    errors,
    handleNpcSelect,
    handleCustomDatesToggle,
    handleSearchKeyDown,
    onSubmit,
    startDate,
    endDate,
    selectedNpcType,
    nameField,
    hasSearchResults,
    showNoResults,
  };
}
