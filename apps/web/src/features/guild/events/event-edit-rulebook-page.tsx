import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, BookOpenText } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Textarea } from "@lootlog/ui/components/textarea";
import type { EventOverviewResponseDto } from "@lootlog/client/main";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
  useUpdateEvent,
} from "@lootlog/client/main";
import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";

interface EventRulebookFormData {
  rulebookMarkdown: string;
}

const toRulebookDefaults = (
  event: EventOverviewResponseDto,
): EventRulebookFormData => ({
  rulebookMarkdown: event.rulebookMarkdown ?? "",
});

export const EventEditRulebookPage = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const routeParams = {
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  };
  const hasEventRouteParams = Boolean(guildId && eventId);

  const {
    data: event,
    isLoading,
    error,
  } = useShowEventOverview(routeParams, {
    query: {
      enabled: hasEventRouteParams,
      queryKey: getShowEventOverviewQueryKey(routeParams),
    },
  });
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

  const form = useForm<EventRulebookFormData>({
    defaultValues: {
      rulebookMarkdown: "",
    },
  });

  useEffect(() => {
    if (event) {
      form.reset(toRulebookDefaults(event));
    }
  }, [event, form]);

  const onSubmit = async (data: EventRulebookFormData) => {
    const normalizedRulebookMarkdown =
      data.rulebookMarkdown.trim().length > 0
        ? data.rulebookMarkdown.trim()
        : "";

    try {
      await updateEvent.mutateAsync({
        pathParams: routeParams,
        data: {
          rulebookMarkdown:
            normalizedRulebookMarkdown.length > 0
              ? normalizedRulebookMarkdown
              : (null as never),
        },
      });
      form.reset({
        rulebookMarkdown: normalizedRulebookMarkdown,
      });
      toast.success(t("events.scoring.saveSuccess"));
    } catch {
      toast.error(t("events.scoring.saveError"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-3 py-3">
        <Card className="gap-4 border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-32 w-full" />
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
    <ScrollArea className="h-full bg-background">
      <div className="flex flex-col gap-3 px-3 py-3">
        <Card className="gap-4 border-border bg-card p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-amber-500/10 p-2">
              <BookOpenText className="size-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("events.editSections.rulebook")}
              </p>
              <h2 className="truncate text-base font-semibold">{event.name}</h2>
            </div>
          </div>
        </Card>

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card className="gap-4 border-border bg-card p-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <BookOpenText className="size-3" />
                {t("events.rulebook.label")}
              </Label>
              <Textarea
                {...form.register("rulebookMarkdown")}
                placeholder={t("events.rulebook.placeholder")}
                className="min-h-[360px] text-sm"
              />
            </div>
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
