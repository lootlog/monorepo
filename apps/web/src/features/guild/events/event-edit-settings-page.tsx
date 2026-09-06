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
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { AlertCircle, Settings } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  fromDateTimeLocalValueToIso,
  toDateTimeLocalValue,
} from "./utils/date-time-local";
import type { EventOverviewResponseDto } from "@lootlog/client/main";
import {
  getShowEventOverviewQueryKey,
  useShowEventOverview,
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
      let normalizedEndsAt: string | undefined;
      if (data.endsAt) {
        normalizedEndsAt = endsAtIso;
      } else if (event.endsAt) {
        normalizedEndsAt = null as never;
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
          icon={Settings}
          title={event.name}
          description={t("events.editSections.settings")}
        />

        <form
          className="space-y-3 pb-24"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <SectionCard className=" border-border bg-card ">
            <SectionCardHeader title={t("events.editSections.settings")} />
            <SectionCardContent className="flex min-h-0 flex-col gap-3">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("events.settings.nameLabel")}
                  </Label>
                  <Input
                    {...form.register("name", { required: true })}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.settings.startsAt")}
                    </Label>
                    <Input
                      type="datetime-local"
                      {...form.register("startsAt")}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.settings.endsAt")}
                    </Label>
                    <Input
                      type="datetime-local"
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
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.settings.assignmentTimeout")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
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
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.settings.participationConfirmation")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
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
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("events.settings.mapAssignmentCap")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
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
