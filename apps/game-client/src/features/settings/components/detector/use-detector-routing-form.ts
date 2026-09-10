import { toggleAvailableGuild } from "@/features/settings/components/shared/settings-guild-selection-grid";
import { getDetectorRoutingSettingsTranslations } from "@/features/settings/components/detector/detector-routing-settings-translations";
import { useUpdateGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DetectorRoutingRule } from "@lootlog/schema/account-preferences";
import { useEffect, useEffectEvent, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";

export const LEVEL_MIN = 0;

export const LEVEL_MAX = 500;

export const clampLevel = (value: number) => {
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, value));
};

const DetectorRoutingRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  minLevel: z.number().min(LEVEL_MIN).max(LEVEL_MAX),
  maxLevel: z.number().min(LEVEL_MIN).max(LEVEL_MAX),
  world: z.string().optional(),
  guildIds: z.array(z.string()),
});

const FormSchema = z.object({
  routingRules: z.array(DetectorRoutingRuleSchema),
});

type FormData = z.infer<typeof FormSchema>;

const createRoutingRuleId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `detector-rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyRoutingRule = (): DetectorRoutingRule => ({
  id: createRoutingRuleId(),
  name: "",
  minLevel: LEVEL_MIN,
  maxLevel: LEVEL_MAX,
  world: "",
  guildIds: [],
});

export const normalizeRoutingRuleText = (name?: string) => {
  if (name === undefined) {
    return undefined;
  }

  const trimmedName = name.trim();

  return trimmedName.length > 0 ? trimmedName : undefined;
};

const cloneRoutingRules = (routingRules: DetectorRoutingRule[]) => {
  return routingRules.map((rule) => ({
    ...rule,
    name: rule.name,
    world: rule.world,
    guildIds: [...rule.guildIds],
  }));
};

const normalizeRoutingRules = (
  routingRules: DetectorRoutingRule[],
  availableGuildIds: string[],
) => {
  return routingRules.map((rule) => {
    const name = normalizeRoutingRuleText(rule.name);
    const normalizedMinLevel = clampLevel(Math.trunc(rule.minLevel));
    const normalizedMaxLevel = clampLevel(Math.trunc(rule.maxLevel));
    const minLevel = Math.min(normalizedMinLevel, normalizedMaxLevel);
    const maxLevel = Math.max(normalizedMinLevel, normalizedMaxLevel);
    const world = normalizeRoutingRuleText(rule.world);

    const normalizedGuildIds = availableGuildIds.filter(
      (guildId, index, ids) => {
        return (
          rule.guildIds.includes(guildId) && ids.indexOf(guildId) === index
        );
      },
    );

    return {
      ...rule,
      name,
      minLevel,
      maxLevel,
      world,
      guildIds: normalizedGuildIds,
    };
  });
};

const areRoutingRulesEqual = (
  left: DetectorRoutingRule[],
  right: DetectorRoutingRule[],
) => {
  return (
    left.length === right.length &&
    left.every((rule, index) => {
      const comparedRule = right[index];

      return (
        rule.id === comparedRule.id &&
        normalizeRoutingRuleText(rule.name) ===
          normalizeRoutingRuleText(comparedRule.name) &&
        rule.minLevel === comparedRule.minLevel &&
        rule.maxLevel === comparedRule.maxLevel &&
        normalizeRoutingRuleText(rule.world) ===
          normalizeRoutingRuleText(comparedRule.world) &&
        rule.guildIds.length === comparedRule.guildIds.length &&
        rule.guildIds.every((guildId, guildIndex) => {
          return guildId === comparedRule.guildIds[guildIndex];
        })
      );
    })
  );
};

const isDeferredRoutingSyncField = (fieldName: string | null) => {
  if (!fieldName) {
    return false;
  }

  return /^routingRules\.\d+\.(name|minLevel|maxLevel|world)$/.test(fieldName);
};

export const toggleOpenRuleId = (
  currentOpenRuleIds: string[],
  ruleId: string,
  open: boolean,
) => {
  if (open) {
    if (currentOpenRuleIds.includes(ruleId)) {
      return currentOpenRuleIds;
    }

    return [...currentOpenRuleIds, ruleId];
  }

  return currentOpenRuleIds.filter((currentRuleId) => currentRuleId !== ruleId);
};

export function useDetectorRoutingForm() {
  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountDetectorSettings();

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();

  const updateUserGameAccountPreferences = useUpdateGameAccountPreferences();

  const translations = getDetectorRoutingSettingsTranslations();

  const currentRoutingRules = accountSettings.routingRules;

  const [deferredSyncField, setDeferredSyncField] = useState<string | null>(
    null,
  );

  const [openRuleIds, setOpenRuleIds] = useState<string[]>([]);

  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, reset, setValue, formState, register, getValues } =
    useForm<FormData>({
      resolver: zodResolver(FormSchema),
      defaultValues: {
        routingRules: cloneRoutingRules(currentRoutingRules),
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "routingRules",
    keyName: "fieldKey",
  });

  useEffect(() => {
    const nextFormValues = {
      routingRules: cloneRoutingRules(currentRoutingRules),
    };

    const currentFormValues = getValues().routingRules ?? [];

    if (areRoutingRulesEqual(currentFormValues, currentRoutingRules)) {
      reset(nextFormValues, {
        keepValues: true,
      });

      return;
    }

    reset(nextFormValues);
  }, [currentRoutingRules, getValues, reset]);

  const watchedData = useWatch({ control });
  const routingRules = watchedData.routingRules ?? [];
  const availableRuleIds = new Set(routingRules.map((rule) => rule.id));

  const visibleOpenRuleIds = new Set(
    openRuleIds.filter((ruleId) => availableRuleIds.has(ruleId)),
  );

  const availableGuildIds = guilds?.map((guild) => guild.id) ?? [];
  const availableGuildIdsJson = JSON.stringify(availableGuildIds);

  const syncCurrentValues = () => {
    if (!accountId || !guilds || !isFetched) {
      return;
    }

    const nextRoutingRules = normalizeRoutingRules(
      getValues().routingRules ?? [],
      availableGuildIds,
    );

    if (areRoutingRulesEqual(nextRoutingRules, currentRoutingRules)) {
      return;
    }

    debouncedUpdate({
      detector: {
        routingRules: nextRoutingRules,
      },
    });
  };

  const syncFromEffect = useEffectEvent(syncCurrentValues);

  useEffect(() => {
    if (!formState.isDirty || isDeferredRoutingSyncField(deferredSyncField)) {
      return;
    }

    syncFromEffect();
  }, [
    accountId,
    availableGuildIdsJson,
    currentRoutingRules,
    debouncedUpdate,
    deferredSyncField,
    formState.isDirty,
    guilds,
    isFetched,
    getValues,
    watchedData,
  ]);

  const toggleGuild = (ruleIndex: number, guildId: string) => {
    if (!guilds) {
      return;
    }

    const selectedGuildIds = routingRules[ruleIndex]?.guildIds ?? [];

    const normalizedGuildIds = toggleAvailableGuild(
      guilds,
      selectedGuildIds,
      guildId,
    );

    setValue(`routingRules.${ruleIndex}.guildIds`, normalizedGuildIds, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const addRoutingRule = () => {
    const nextRule = createEmptyRoutingRule();

    append(nextRule, {
      shouldFocus: false,
    });

    setOpenRuleIds((currentOpenRuleIds) =>
      toggleOpenRuleId(currentOpenRuleIds, nextRule.id, true),
    );
  };

  return {
    guilds,
    translations,
    setDeferredSyncField,
    setOpenRuleIds,
    register,
    fields,
    remove,
    routingRules,
    visibleOpenRuleIds,
    syncCurrentValues,
    toggleGuild,
    addRoutingRule,
  };
}
