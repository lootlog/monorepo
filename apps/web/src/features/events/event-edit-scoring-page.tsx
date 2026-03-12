import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import {
  AlertCircle,
  Loader2,
  RefreshCcw,
  Settings,
  Trophy,
} from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEventOverview } from "./hooks/queries/use-event-overview";
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
import { ScoringRulesEditor } from "./components/dialogs/scoring-rules-editor";

interface EventScoringFormData {
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const toScoringDefaults = (
  event: NonNullable<ReturnType<typeof useEventOverview>["data"]>,
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

  const { data: event, isLoading, error } = useEventOverview(routeParams);
  const { updateEvent, recalculatePoints } = useEventMutations(
    routeParams.guildId,
    routeParams.eventId,
  );

  const form = useForm<EventScoringFormData>({
    defaultValues: {
      scoringMode: "SIMPLE",
      scoringRules: normalizeScoringRules(DEFAULT_ADVANCED_EVENT_SCORING_RULES),
    },
  });

  useEffect(() => {
    if (event) {
      form.reset(toScoringDefaults(event));
    }
  }, [event, form]);

  const scoringMode = normalizeScoringMode(form.watch("scoringMode"));

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
    } catch {
      toast.error(t("events.scoring.saveError"));
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-primary" />
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
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
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
        </Card>

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card className="gap-4 border-border bg-card/40 p-3 backdrop-blur-sm">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.scoring.mode")}
              </Label>
              <select
                {...form.register("scoringMode")}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="SIMPLE">
                  {t("events.scoring.modeSimpleTitle")}
                </option>
                <option value="ADVANCED">
                  {t("events.scoring.modeAdvancedTitle")}
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                {scoringMode === "ADVANCED"
                  ? t("events.scoring.modeAdvancedDescription")
                  : t("events.scoring.modeSimpleDescription")}
              </p>
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
                  t={t}
                />
              </div>
            </Card>
          )}

          <Card className="gap-3 border-border bg-card/40 p-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleRecalculate}
              disabled={recalculatePoints.isPending}
            >
              {recalculatePoints.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  {t("events.scoring.recalculating")}
                </>
              ) : (
                <>
                  <RefreshCcw className="size-3.5 mr-1.5" />
                  {t("events.scoring.recalculateButton")}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("events.scoring.recalculateHint")}
            </p>
          </Card>

          <UnsavedChangesBar
            isDirty={form.formState.isDirty}
            isSubmitting={form.formState.isSubmitting}
            onReset={() => form.reset()}
          />
        </form>
      </div>
    </ScrollArea>
  );
};
