import { EventEditSkeleton } from "./event-edit-skeleton";
import { EventLoadError } from "./components/event-load-error";
import { useEventEditRoute } from "./hooks/queries/use-event-edit-route";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PageHeader } from "@/components/common/page-header";
import { useEffect, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BookOpenText } from "lucide-react";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Textarea } from "@lootlog/ui/components/textarea";
import {
  type EventOverviewResponseDto,
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
  const rulebookFieldId = useId();
  const { event, error, isLoading, refetch, routeParams } = useEventEditRoute();

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
          rulebookMarkdown: normalizedRulebookMarkdown,
        },
      });
      form.reset({
        rulebookMarkdown: normalizedRulebookMarkdown,
      });
      toast.success(t("events.rulebook.saveSuccess"));
    } catch {
      toast.error(t("events.rulebook.saveError"));
    }
  };

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
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 px-3 py-3">
        <PageHeader icon={BookOpenText} title={event.name} />

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <SectionCard>
            <SectionCardContent className="flex min-h-0 flex-col gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor={rulebookFieldId}
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {t("events.rulebook.label")}
                </Label>
                <Textarea
                  id={rulebookFieldId}
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
