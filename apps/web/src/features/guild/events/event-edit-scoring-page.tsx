import { Link, useParams } from "@tanstack/react-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { AlertCircle, RefreshCcw, Settings, Trophy } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
  type EventScoringRules,
} from "./types/scoring-rules";
import {
  normalizeScoringMode,
  normalizeScoringRules,
} from "./utils/scoring-rules";
import { getApiErrorMessage } from "./utils/get-api-error-message";
import { ScoringRulesEditor } from "./components/scoring/scoring-rules-editor";
import { ScoringModeSelector } from "./components/scoring/scoring-mode-selector";
import type { EventOverviewResponseDto } from "@/lib/api/generated/main/model";
import { useShowEventOverview } from "@/lib/api/generated/main/events/events";

interface EventScoringFormData {
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const toScoringDefaults = (
  event: EventOverviewResponseDto,
): EventScoringFormData => {
  const scoringMode = normalizeScoringMode(event.scoringMode);
  return {
    scoringMode,
    scoringRules:
      scoringMode === "ADVANCED"
        ? normalizeScoringRules(event.scoringRules)
        : normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
  };
};

export const EventEditScoringPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const routeParams = {
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  };

  const { data: event, isLoading, error } = useShowEventOverview(routeParams);
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </Card>
        <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events/$eventId" params={routeParams}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full bg-background/50">
      <EventEditScoringForm
        key={`${event.id}:${event.updatedAt}:${event.scoringMode}`}
        event={event}
        routeParams={routeParams}
      />
    </ScrollArea>
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
  const { updateEvent, recalculatePoints } = useEventMutations(
    routeParams.guildId,
    routeParams.eventId,
  );
  const form = useForm<EventScoringFormData>({
    defaultValues: toScoringDefaults(event),
  });

  const scoringMode = normalizeScoringMode(
    useWatch({
      control: form.control,
      name: "scoringMode",
      defaultValue: toScoringDefaults(event).scoringMode,
    }),
  );

  const onSubmit = async (data: EventScoringFormData) => {
    const normalizedMode = normalizeScoringMode(data.scoringMode);
    const normalizedScoringRules =
      normalizedMode === "ADVANCED"
        ? normalizeScoringRules(data.scoringRules)
        : normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES);

    try {
      await updateEvent.mutateAsync({
        scoringMode: normalizedMode,
        scoringRules:
          normalizedMode === "ADVANCED" ? normalizedScoringRules : null,
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
      await recalculatePoints.mutateAsync();
      toast.success(t("events.scoring.recalculateSuccess"));
    } catch {
      toast.error(t("events.scoring.recalculateError"));
    }
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-emerald-500/10 p-2 shadow-inner shadow-emerald-500/10">
              <Trophy className="size-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("events.editSections.scoring")}
              </p>
              <h2 className="truncate text-base font-semibold">{event.name}</h2>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculatePoints.isPending}
            title={t("events.scoring.recalculateHint")}
          >
            {recalculatePoints.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <RefreshCcw className="size-3.5" />
            )}
            {recalculatePoints.isPending
              ? t("events.scoring.recalculating")
              : t("events.scoring.recalculateButton")}
          </Button>
        </div>
      </Card>

      <form className="space-y-3 pb-24" onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.scoring.mode")}
            </Label>
            <Controller
              control={form.control}
              name="scoringMode"
              render={({ field }) => (
                <ScoringModeSelector
                  value={normalizeScoringMode(field.value)}
                  onChange={(mode) => field.onChange(mode)}
                />
              )}
            />
          </div>
        </Card>

        {scoringMode === "ADVANCED" && (
          <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Settings className="size-3" />
                {t("events.scoring.title")}
              </Label>
              <ScoringRulesEditor
                control={form.control}
                register={form.register}
                setValue={form.setValue}
              />
            </div>
          </Card>
        )}

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset(toScoringDefaults(event))}
        />
      </form>
    </div>
  );
};
