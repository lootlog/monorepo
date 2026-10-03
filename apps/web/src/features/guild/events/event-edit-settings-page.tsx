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
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { Settings } from "lucide-react";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  fromDateTimeLocalValueToIso,
  toDateTimeLocalValue,
} from "./utils/date-time-local";
import {
  type EventOverviewResponseDto,
  useUpdateEvent,
} from "@lootlog/client/main";

import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";

interface EventSettingsFormData {
  name: string;
  startsAt: string;
  endsAt: string;
  assignmentTimeoutMinutes: number;
  participationConfirmationMinutes: number;
  mapAssignmentCap: number;
}

const toSettingsDefaults = (
  event: EventOverviewResponseDto,
): EventSettingsFormData => ({
  name: event.name,
  startsAt: toDateTimeLocalValue(event.startsAt ?? event.createdAt),
  endsAt: toDateTimeLocalValue(event.endsAt),
  assignmentTimeoutMinutes: event.assignmentTimeoutMinutes ?? 5,
  participationConfirmationMinutes: event.participationConfirmationMinutes ?? 0,
  mapAssignmentCap: event.mapAssignmentCap ?? 0,
});

export const EventEditSettingsPage = () => {
  const { t } = useTranslation();
  const fieldIdPrefix = useId();
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

  const form = useForm<EventSettingsFormData>({
    defaultValues: {
      name: "",
      startsAt: "",
      endsAt: "",
      assignmentTimeoutMinutes: 5,
      participationConfirmationMinutes: 0,
      mapAssignmentCap: 0,
    },
  });

  useEffect(() => {
    if (event) {
      form.reset(toSettingsDefaults(event));
    }
  }, [event, form]);

  const onSubmit = async (data: EventSettingsFormData) => {
    if (!event) {
      return;
    }

    if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
      toast.error(t("events.settings.endDateMustBeAfterStart"));

      return;
    }

    try {
      const startsAt = fromDateTimeLocalValueToIso(data.startsAt);
      const endsAtIso = fromDateTimeLocalValueToIso(data.endsAt);
      let normalizedEndsAt: string | null | undefined;

      if (data.endsAt) {
        normalizedEndsAt = endsAtIso;
      } else if (event.endsAt) {
        normalizedEndsAt = null;
      }

      const normalizedAssignmentTimeoutMinutes = Number.isFinite(
        data.assignmentTimeoutMinutes,
      )
        ? Math.max(0, Math.round(data.assignmentTimeoutMinutes))
        : 5;

      const normalizedParticipationConfirmationMinutes = Number.isFinite(
        data.participationConfirmationMinutes,
      )
        ? Math.max(0, Math.round(data.participationConfirmationMinutes))
        : 0;

      const normalizedMapAssignmentCap = Number.isFinite(data.mapAssignmentCap)
        ? Math.max(0, Math.round(data.mapAssignmentCap))
        : 0;

      const normalizedName = data.name.trim();

      await updateEvent.mutateAsync({
        pathParams: routeParams,
        data: {
          name: normalizedName,
          startsAt,
          endsAt: normalizedEndsAt,
          assignmentTimeoutMinutes: normalizedAssignmentTimeoutMinutes,
          participationConfirmationMinutes:
            normalizedParticipationConfirmationMinutes,
          mapAssignmentCap: normalizedMapAssignmentCap,
        },
      });
      form.reset({
        name: normalizedName,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        assignmentTimeoutMinutes: normalizedAssignmentTimeoutMinutes,
        participationConfirmationMinutes:
          normalizedParticipationConfirmationMinutes,
        mapAssignmentCap: normalizedMapAssignmentCap,
      });
      toast.success(t("events.settings.saveSuccess"));
    } catch {
      toast.error(t("events.settings.saveError"));
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
        <PageHeader icon={Settings} title={event.name} />

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <SectionCard>
            <SectionCardContent className="flex min-h-0 flex-col gap-3">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${fieldIdPrefix}-name`}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {t("events.settings.nameLabel")}
                  </Label>
                  <Input
                    id={`${fieldIdPrefix}-name`}
                    {...form.register("name", { required: true })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${fieldIdPrefix}-startsAt`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t("events.settings.startsAt")}
                    </Label>
                    <Input
                      type="datetime-local"
                      id={`${fieldIdPrefix}-startsAt`}
                      {...form.register("startsAt")}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${fieldIdPrefix}-endsAt`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t("events.settings.endsAt")}
                    </Label>
                    <Input
                      type="datetime-local"
                      id={`${fieldIdPrefix}-endsAt`}
                      {...form.register("endsAt")}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("events.settings.datesHint")}
                </p>

                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${fieldIdPrefix}-assignmentTimeoutMinutes`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t("events.settings.assignmentTimeout")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      id={`${fieldIdPrefix}-assignmentTimeoutMinutes`}
                      {...form.register("assignmentTimeoutMinutes", {
                        valueAsNumber: true,
                      })}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("events.settings.assignmentTimeoutDescription")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`${fieldIdPrefix}-participationConfirmationMinutes`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t("events.settings.participationConfirmation")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      id={`${fieldIdPrefix}-participationConfirmationMinutes`}
                      {...form.register("participationConfirmationMinutes", {
                        valueAsNumber: true,
                      })}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "events.settings.participationConfirmationDescription",
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`${fieldIdPrefix}-mapAssignmentCap`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t("events.settings.mapAssignmentCap")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      id={`${fieldIdPrefix}-mapAssignmentCap`}
                      {...form.register("mapAssignmentCap", {
                        valueAsNumber: true,
                      })}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("events.settings.mapAssignmentCapDescription")}
                    </p>
                  </div>
                </div>
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
