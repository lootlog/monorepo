import { EventEditSkeleton } from "./event-edit-skeleton";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, BookOpenText } from "lucide-react";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Button } from "@lootlog/ui/components/button";
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
    return <EventEditSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 max-h-full overflow-y-auto [justify-content:safe_center]">
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
        <PageHeader
          icon={BookOpenText}
          title={event.name}
          description={t("events.editSections.rulebook")}
        />

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <SectionCard className=" border-border bg-card ">
            <SectionCardHeader title={t("events.editSections.rulebook")} />
            <SectionCardContent className="flex min-h-0 flex-col gap-3">
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
            </SectionCardContent>
          </SectionCard>

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
