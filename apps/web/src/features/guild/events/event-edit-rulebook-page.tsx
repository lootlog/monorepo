import { EventEditSkeleton } from "./event-edit-skeleton";
import { EventLoadError } from "./components/event-load-error";
import { useEventEditRoute } from "./hooks/queries/use-event-edit-route";
import { BandSection } from "@/components/common/band-section";
import { useEffect, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
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
    <>
      <h1 className="sr-only">{event.name}</h1>

      <form className="pb-24" onSubmit={form.handleSubmit(onSubmit)}>
        <BandSection id="event-rulebook" title={t("events.rulebook.label")}>
          <Textarea
            id={rulebookFieldId}
            aria-labelledby="event-rulebook"
            {...form.register("rulebookMarkdown")}
            placeholder={t("events.rulebook.placeholder")}
            className="min-h-[360px]"
          />
        </BandSection>

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset()}
        />
      </form>
    </>
  );
};
