import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, Loader2, Pencil } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";
import {
  fromDateTimeLocalValueToIso,
  toDateTimeLocalValue,
} from "./utils/date-time-local";

interface EventSettingsFormData {
  name: string;
  startsAt: string;
  endsAt: string;
  assignmentTimeoutMinutes: number;
  participationConfirmationMinutes: number;
  mapAssignmentCap: number;
}

const toSettingsDefaults = (
  event: NonNullable<ReturnType<typeof useEventOverview>["data"]>,
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

  const { data: event, isLoading, error } = useEventOverview(routeParams);
  const { updateEvent } = useEventMutations(routeParams.guildId, routeParams.eventId);

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
      toast.error(
        t(
          "events.createDialog.endDateMustBeAfterStart",
          "Data końca musi być po dacie startu",
        ),
      );
      return;
    }

    try {
      const startsAt = fromDateTimeLocalValueToIso(data.startsAt);
      const endsAtIso = fromDateTimeLocalValueToIso(data.endsAt);

      await updateEvent.mutateAsync({
        name: data.name.trim(),
        startsAt,
        endsAt: data.endsAt ? endsAtIso : event.endsAt ? null : undefined,
        assignmentTimeoutMinutes: Number.isFinite(data.assignmentTimeoutMinutes)
          ? Math.max(0, Math.round(data.assignmentTimeoutMinutes))
          : 5,
        participationConfirmationMinutes: Number.isFinite(
          data.participationConfirmationMinutes,
        )
          ? Math.max(0, Math.round(data.participationConfirmationMinutes))
          : 0,
        mapAssignmentCap: Number.isFinite(data.mapAssignmentCap)
          ? Math.max(0, Math.round(data.mapAssignmentCap))
          : 0,
      });
      toast.success(t("events.scoring.saveSuccess"));
    } catch {
      toast.error(t("events.scoring.saveError"));
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
    <div className="h-full overflow-y-auto p-4">
      <Card className="max-w-4xl mx-auto p-4 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{t("events.editSections.settings")}</h1>
            <p className="text-sm text-muted-foreground">{event.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/$guildId/events/$eventId" params={routeParams}>
              <Button variant="outline" size="sm">
                {t("events.createDialog.cancel")}
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateEvent.isPending}
            >
              {updateEvent.isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  {t("events.scoring.saving")}
                </>
              ) : (
                <>
                  <Pencil className="size-3.5 mr-1.5" />
                  {t("events.scoring.save")}
                </>
              )}
            </Button>
          </div>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.createDialog.nameLabel")}
            </Label>
            <Input {...form.register("name", { required: true })} className="h-9 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.startsAt", "Data rozpoczęcia")}
              </Label>
              <Input type="datetime-local" {...form.register("startsAt")} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.endsAt", "Data zakończenia")}
              </Label>
              <Input type="datetime-local" {...form.register("endsAt")} className="h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.settings.assignmentTimeout", "Czas na przypisanie (minuty)")}
            </Label>
            <Input
              type="number"
              min={0}
              {...form.register("assignmentTimeoutMinutes", { valueAsNumber: true })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.settings.participationConfirmation", "Potwierdzenie udziału (minuty)")}
            </Label>
            <Input
              type="number"
              min={0}
              {...form.register("participationConfirmationMinutes", { valueAsNumber: true })}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("events.settings.mapAssignmentCap", "Limit osób na mapie")}
            </Label>
            <Input
              type="number"
              min={0}
              {...form.register("mapAssignmentCap", { valueAsNumber: true })}
              className="h-9 text-sm"
            />
          </div>
        </form>
      </Card>
    </div>
  );
};
