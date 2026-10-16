import { EventEditSkeleton } from "./event-edit-skeleton";
import { EventLoadError } from "./components/event-load-error";
import { useEventEditRoute } from "./hooks/queries/use-event-edit-route";
import { BandSection } from "@/components/common/band-section";
import { useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { RefreshCw } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
  type EventScoringRules,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";

import { getApiErrorMessage } from "@lootlog/client/transport";
import { ScoringRulesEditor } from "./components/scoring/scoring-rules-editor";
import { ScoringModeSelector } from "./components/scoring/scoring-mode-selector";
import {
  type EventOverviewResponseDto,
  useRecalculateEventPoints,
  useUpdateEvent,
} from "@lootlog/client/main";

import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";
import { invalidateKillQueries } from "./hooks/mutations/invalidate-kill-queries";
import { hasValidScoringNumbers } from "./utils/scoring-number-validation";

interface EventScoringFormData {
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const toScoringDefaults = (
  event: EventOverviewResponseDto,
): EventScoringFormData => {
  const scoringMode = normalizeEventScoringMode(event.scoringMode);

  return {
    scoringMode,
    scoringRules:
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(event.scoringRules)
        : normalizeEventScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
  };
};

export const EventEditScoringPage = () => {
  const { event, error, isLoading, refetch, routeParams } = useEventEditRoute();

  if (isLoading) {
    return <EventEditSkeleton />;
  }

  if (error || !event) {
    return (
      <EventLoadError
        backTo="event"
        guildId={routeParams.guildId}
        eventId={routeParams.eventId}
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <EventEditScoringForm
      key={`${event.id}:${event.updatedAt}:${event.scoringMode}`}
      event={event}
      routeParams={routeParams}
    />
  );
};

const EventEditScoringForm = ({
  event,
  routeParams,
}: {
  event: EventOverviewResponseDto;
  routeParams: {
    guildId: string;
    eventId: string;
  };
}) => {
  const { t } = useTranslation();
  const modeHeadingId = useId();
  const queryClient = useQueryClient();

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        invalidateEventDetailQueries(
          queryClient,
          routeParams.guildId,
          routeParams.eventId,
        );
      },
    },
  });

  const recalculatePoints = useRecalculateEventPoints({
    mutation: {
      onSuccess: () => {
        invalidateEventDetailQueries(
          queryClient,
          routeParams.guildId,
          routeParams.eventId,
        );
        invalidateKillQueries(
          queryClient,
          routeParams.guildId,
          routeParams.eventId,
        );
      },
    },
  });

  const form = useForm<EventScoringFormData>({
    defaultValues: toScoringDefaults(event),
  });

  const scoringMode = normalizeEventScoringMode(
    useWatch({
      control: form.control,
      name: "scoringMode",
      defaultValue: toScoringDefaults(event).scoringMode,
    }),
  );

  const onSubmit = async (data: EventScoringFormData) => {
    const normalizedMode = normalizeEventScoringMode(data.scoringMode);

    const normalizedScoringRules =
      normalizedMode === "ADVANCED"
        ? normalizeEventScoringRules(data.scoringRules)
        : normalizeEventScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES);

    try {
      const request: Parameters<typeof updateEvent.mutateAsync>[0]["data"] = {
        scoringMode: normalizedMode,
      };

      if (normalizedMode === "ADVANCED")
        request.scoringRules = normalizedScoringRules;
      await updateEvent.mutateAsync({
        pathParams: routeParams,
        data: request,
      });
      form.reset({
        scoringMode: normalizedMode,
        scoringRules: normalizedScoringRules,
      });
      toast.success(t("events.scoring.saveSuccess"));
    } catch (error) {
      toast.error(getApiErrorMessage(error) ?? t("events.scoring.saveError"));
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculatePoints.mutateAsync({
        pathParams: routeParams,
      });
      toast.success(t("events.scoring.recalculateSuccess"));
    } catch {
      toast.error(t("events.scoring.recalculateError"));
    }
  };

  return (
    <>
      <h1 className="sr-only">{event.name}</h1>

      <form className="pb-24" onSubmit={form.handleSubmit(onSubmit)}>
        <BandSection
          id={modeHeadingId}
          title={t("events.scoring.mode")}
          trailing={
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRecalculate}
              loading={recalculatePoints.isPending}
              icon=<RefreshCw className="size-3.5" />
              title={t("events.scoring.recalculateHint")}
            >
              {t("events.scoring.recalculateButton")}
            </Button>
          }
        >
          <Controller
            control={form.control}
            name="scoringMode"
            render={({ field }) => (
              <ScoringModeSelector
                aria-labelledby={modeHeadingId}
                value={normalizeEventScoringMode(field.value)}
                onChange={(mode) => field.onChange(mode)}
              />
            )}
          />
        </BandSection>

        {scoringMode === "ADVANCED" && (
          <BandSection
            id="event-scoring-rules"
            title={t("events.scoring.title")}
            wide
          >
            <Controller
              control={form.control}
              name="scoringRules"
              rules={{
                validate: (value) =>
                  hasValidScoringNumbers(value) ||
                  t("events.scoring.validation.invalidRules"),
              }}
              render={({ field, fieldState }) => (
                <ScoringRulesEditor
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  ref={field.ref}
                />
              )}
            />
          </BandSection>
        )}

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset(toScoringDefaults(event))}
        />
      </form>
    </>
  );
};
