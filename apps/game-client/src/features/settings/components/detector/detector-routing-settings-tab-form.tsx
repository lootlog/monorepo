import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DetectorRoutingRuleCard } from "@/features/settings/components/detector/detector-routing-rule-card";
import { getDetectorRoutingSettingsTranslations } from "@/features/settings/components/detector/detector-routing-settings-translations";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useUpdateUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DetectorRoutingRule } from "@lootlog/types";
import { Plus } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useDeepCompareEffect } from "react-use";
import { z } from "zod";

const LEVEL_MIN = 0;
const LEVEL_MAX = 500;

const clampLevel = (value: number) => {
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, value));
};

const DetectorRoutingRuleSchema = z.object({
  id: z.string().min(1),
  minLevel: z.number().min(LEVEL_MIN).max(LEVEL_MAX),
  maxLevel: z.number().min(LEVEL_MIN).max(LEVEL_MAX),
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
  minLevel: LEVEL_MIN,
  maxLevel: LEVEL_MAX,
  guildIds: [],
});

const cloneRoutingRules = (routingRules: DetectorRoutingRule[]) => {
  return routingRules.map((rule) => ({
    ...rule,
    guildIds: [...rule.guildIds],
  }));
};

const normalizeRoutingRules = (
  routingRules: DetectorRoutingRule[],
  availableGuildIds: string[],
) => {
  return routingRules.map((rule) => {
    const normalizedMinLevel = clampLevel(Math.trunc(rule.minLevel));
    const normalizedMaxLevel = clampLevel(Math.trunc(rule.maxLevel));
    const minLevel = Math.min(normalizedMinLevel, normalizedMaxLevel);
    const maxLevel = Math.max(normalizedMinLevel, normalizedMaxLevel);
    const normalizedGuildIds = availableGuildIds.filter(
      (guildId, index, ids) => {
        return (
          rule.guildIds.includes(guildId) && ids.indexOf(guildId) === index
        );
      },
    );

    return {
      ...rule,
      minLevel,
      maxLevel,
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
        rule.minLevel === comparedRule.minLevel &&
        rule.maxLevel === comparedRule.maxLevel &&
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

  return /^routingRules\.\d+\.(minLevel|maxLevel)$/.test(fieldName);
};

const toggleOpenRuleId = (
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

export const DetectorRoutingSettingsTabForm: FC = () => {
  const {
    accountId,
    isFetched,
    settings: accountSettings,
  } = useCurrentGameAccountDetectorSettings();
  const { data: guilds } = useGuilds();
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);
  const translations = getDetectorRoutingSettingsTranslations();

  const currentRoutingRules = accountSettings.routingRules;
  const deferredSyncFieldRef = useRef<string | null>(null);
  const [openRuleIds, setOpenRuleIds] = useState<string[]>([]);
  const debouncedUpdate = useDebouncedCallback(
    (
      payload: Parameters<typeof updateUserGameAccountPreferences.mutate>[0],
    ) => {
      updateUserGameAccountPreferences.mutate(payload);
    },
    300,
  );

  const { control, watch, reset, setValue, formState, register, getValues } =
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

  useDeepCompareEffect(() => {
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

  const watchedData = watch();
  const routingRules = watchedData.routingRules ?? [];
  const availableGuildIds = guilds?.map((guild) => guild.id) ?? [];

  useEffect(() => {
    const availableRuleIds = new Set(routingRules.map((rule) => rule.id));

    setOpenRuleIds((currentOpenRuleIds) => {
      return currentOpenRuleIds.filter((ruleId) =>
        availableRuleIds.has(ruleId),
      );
    });
  }, [routingRules]);

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

  useDeepCompareEffect(() => {
    if (
      !formState.isDirty ||
      isDeferredRoutingSyncField(deferredSyncFieldRef.current)
    ) {
      return;
    }

    syncCurrentValues();
  }, [
    accountId,
    availableGuildIds,
    currentRoutingRules,
    debouncedUpdate,
    formState.isDirty,
    guilds,
    isFetched,
    watchedData,
  ]);

  const toggleGuild = (ruleIndex: number, guildId: string) => {
    if (!guilds) {
      return;
    }

    const selectedGuildIds = routingRules[ruleIndex]?.guildIds ?? [];
    const nextGuildIds = selectedGuildIds.includes(guildId)
      ? selectedGuildIds.filter((currentGuildId) => currentGuildId !== guildId)
      : [...selectedGuildIds, guildId];
    const normalizedGuildIds = guilds
      .map((guild) => guild.id)
      .filter((currentGuildId) => nextGuildIds.includes(currentGuildId));

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

  return (
    <form className="ll:flex ll:flex-col ll:gap-3 ll:py-1">
      <SettingsSection
        title={translations.sectionTitle}
        description={translations.sectionDescription}
        actions={
          <Button
            type="button"
            onClick={addRoutingRule}
            className="ll:h-7 ll:gap-1.5 ll:px-2.5 ll:text-[11px] ll:font-semibold"
          >
            <Plus size={14} />
            {translations.addRuleButton}
          </Button>
        }
      >
        <div className="ll:grid ll:gap-3">
          {fields.length === 0 && (
            <SettingsEmptyState>{translations.emptyState}</SettingsEmptyState>
          )}

          {fields.map((field, index) => {
            const rule = routingRules[index];
            const ruleId = rule?.id ?? field.id;
            const selectedGuildIds = rule?.guildIds ?? [];

            return (
              <DetectorRoutingRuleCard
                key={field.fieldKey}
                fieldIdInput={
                  <input
                    type="hidden"
                    {...register(`routingRules.${index}.id`)}
                  />
                }
                guilds={guilds}
                index={index}
                isOpen={openRuleIds.includes(ruleId)}
                minLevel={rule?.minLevel ?? LEVEL_MIN}
                maxLevel={rule?.maxLevel ?? LEVEL_MAX}
                onOpenChange={(open) => {
                  setOpenRuleIds((currentOpenRuleIds) =>
                    toggleOpenRuleId(currentOpenRuleIds, ruleId, open),
                  );
                }}
                onRemove={() => {
                  setOpenRuleIds((currentOpenRuleIds) =>
                    currentOpenRuleIds.filter(
                      (currentRuleId) => currentRuleId !== ruleId,
                    ),
                  );
                  remove(index);
                }}
                onToggleGuild={(guildId) => toggleGuild(index, guildId)}
                selectedGuildIds={selectedGuildIds}
                translations={translations}
                minLevelField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-min-level`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.minLevelLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-min-level`}
                      type="number"
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
                      onFocus={() => {
                        deferredSyncFieldRef.current = `routingRules.${index}.minLevel`;
                      }}
                      {...register(`routingRules.${index}.minLevel`, {
                        onBlur: () => {
                          deferredSyncFieldRef.current = null;
                          syncCurrentValues();
                        },
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          ) {
                            return LEVEL_MIN;
                          }

                          const parsedValue = Number(value);

                          if (Number.isNaN(parsedValue)) {
                            return LEVEL_MIN;
                          }

                          return clampLevel(parsedValue);
                        },
                      })}
                    />
                  </div>
                }
                maxLevelField={
                  <div className="ll:space-y-1">
                    <Label
                      htmlFor={`detector-routing-${field.id}-max-level`}
                      className="ll:text-[10px] ll:leading-none"
                    >
                      {translations.maxLevelLabel}
                    </Label>
                    <Input
                      id={`detector-routing-${field.id}-max-level`}
                      type="number"
                      min={LEVEL_MIN}
                      max={LEVEL_MAX}
                      className="ll:h-7 ll:px-2 ll:text-[11px]"
                      onFocus={() => {
                        deferredSyncFieldRef.current = `routingRules.${index}.maxLevel`;
                      }}
                      {...register(`routingRules.${index}.maxLevel`, {
                        onBlur: () => {
                          deferredSyncFieldRef.current = null;
                          syncCurrentValues();
                        },
                        setValueAs: (value) => {
                          if (
                            value === "" ||
                            value === null ||
                            value === undefined
                          ) {
                            return LEVEL_MAX;
                          }

                          const parsedValue = Number(value);

                          if (Number.isNaN(parsedValue)) {
                            return LEVEL_MAX;
                          }

                          return clampLevel(parsedValue);
                        },
                      })}
                    />
                  </div>
                }
              />
            );
          })}
        </div>
      </SettingsSection>
    </form>
  );
};
