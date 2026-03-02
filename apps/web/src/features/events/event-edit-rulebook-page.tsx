import { useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle, BookOpenText, Loader2, Pencil } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { useEventOverview } from "./hooks/queries/use-event-overview";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";

interface EventRulebookFormData {
  rulebookMarkdown: string;
}

const toRulebookDefaults = (
  event: NonNullable<ReturnType<typeof useEventOverview>["data"]>,
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

  const { data: event, isLoading, error } = useEventOverview(routeParams);
  const { updateEvent } = useEventMutations(routeParams.guildId, routeParams.eventId);

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
    try {
      await updateEvent.mutateAsync({
        rulebookMarkdown:
          data.rulebookMarkdown.trim().length > 0
            ? data.rulebookMarkdown.trim()
            : null,
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
            <h1 className="text-lg font-semibold">{t("events.editSections.rulebook")}</h1>
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
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <BookOpenText className="size-3" />
              {t("events.rulebook.label", "Regulamin eventu")}
            </Label>
            <Textarea
              {...form.register("rulebookMarkdown")}
              placeholder={t(
                "events.rulebook.placeholder",
                "Wpisz regulamin eventu, zasady uczestnictwa i dodatkowe informacje.",
              )}
              className="min-h-[220px] text-sm"
            />
          </div>
        </form>
      </Card>
    </div>
  );
};
