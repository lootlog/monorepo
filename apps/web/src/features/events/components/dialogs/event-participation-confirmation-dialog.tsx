import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock, Loader2, ShieldCheck } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { NpcTile } from "@/components/tiles";
import { formatDateTime } from "../../utils";
import { useEventParticipationConfirmation } from "../../hooks/mutations/use-event-participation-confirmation";
import { useEventParticipationConfirmations } from "../../hooks/queries/use-event-participation-confirmations";

interface EventParticipationConfirmationDialogProps {
  guildId?: string;
  eventId?: string;
}

export const EventParticipationConfirmationDialog = ({
  guildId,
  eventId,
}: EventParticipationConfirmationDialogProps) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [confirmingKillId, setConfirmingKillId] = useState<string | null>(null);

  const isEnabled = Boolean(guildId && eventId);

  const { data, isLoading } = useEventParticipationConfirmations({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    enabled: isEnabled,
  });
  const confirmParticipation = useEventParticipationConfirmation({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  useEffect(() => {
    setDismissed(false);
  }, [eventId]);

  const sortedItems = [...(data?.items ?? [])].sort(
    (a, b) =>
      new Date(a.confirmationDeadlineAt).getTime() -
      new Date(b.confirmationDeadlineAt).getTime(),
  );
  const sortedExpiredItems = [...(data?.expiredItems ?? [])].sort(
    (a, b) =>
      new Date(b.confirmationDeadlineAt).getTime() -
      new Date(a.confirmationDeadlineAt).getTime(),
  );
  const open =
    isEnabled &&
    !dismissed &&
    (sortedItems.length > 0 || sortedExpiredItems.length > 0);

  const handleConfirm = async (killId: string) => {
    try {
      setConfirmingKillId(killId);
      await confirmParticipation.mutateAsync(killId);
      toast.success(
        t(
          "events.confirmation.success",
          "Udział został potwierdzony i punkty doliczone",
        ),
      );
    } catch {
      toast.error(
        t(
          "events.confirmation.error",
          "Nie udało się potwierdzić udziału (limit czasu mógł minąć)",
        ),
      );
    } finally {
      setConfirmingKillId(null);
    }
  };

  const handleConfirmAll = async () => {
    await Promise.all(sortedItems.map((item) => handleConfirm(item.killId)));
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && setDismissed(true)}
    >
      <DialogContent
        className="sm:max-w-xl p-5"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {t("events.confirmation.title", "Potwierdź udział")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "events.confirmation.description",
              "Potwierdź udział w obstawianiu, aby naliczyć punkty za te bicia.",
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <>
            {sortedItems.length > 0 && (
              <>
                <ScrollArea className="max-h-[320px] pr-2 py-4">
                  <div className="space-y-2">
                    {sortedItems.map((item) => {
                      const deadline = new Date(item.confirmationDeadlineAt);
                      const remaining = formatDistanceToNowStrict(deadline, {
                        addSuffix: true,
                        locale: pl,
                      });

                      return (
                        <div
                          key={item.killId}
                          className="rounded-lg border border-border/70 bg-card/60 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.heroNpc.npcIcon ? (
                                <NpcTile
                                  npc={{
                                    id: undefined,
                                    name: item.heroNpc.npcName,
                                    icon: item.heroNpc.npcIcon,
                                  }}
                                />
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {item.heroNpc.npcName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(new Date(item.killedAt))}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {t(
                                    "events.confirmation.deadline",
                                    "Do",
                                  )}: {formatDateTime(deadline)} ({remaining})
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                Boolean(confirmingKillId) ||
                                confirmParticipation.isPending
                              }
                              onClick={() => handleConfirm(item.killId)}
                            >
                              {confirmingKillId === item.killId ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                t("events.confirmation.confirm", "Potwierdź")
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleConfirmAll}
                    disabled={
                      Boolean(confirmingKillId) ||
                      confirmParticipation.isPending
                    }
                  >
                    {t("events.confirmation.confirmAll", "Potwierdź wszystko")}
                  </Button>
                </div>
              </>
            )}

            {sortedExpiredItems.length > 0 && (
              <div className={sortedItems.length > 0 ? "mt-4" : undefined}>
                <div className="mb-2 flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="size-4" />
                  <p className="text-sm font-semibold">
                    {t(
                      "events.confirmation.expiredTitle",
                      "Przeterminowane potwierdzenia",
                    )}
                  </p>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t(
                    "events.confirmation.expiredDescription",
                    "Dla tych bić nie potwierdzono udziału na czas, więc punkty nie zostały naliczone.",
                  )}
                </p>

                <ScrollArea className="max-h-[180px] pr-2">
                  <div className="space-y-2">
                    {sortedExpiredItems.map((item) => {
                      const deadline = new Date(item.confirmationDeadlineAt);
                      return (
                        <div
                          key={item.killId}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.heroNpc.npcIcon ? (
                              <NpcTile
                                npc={{
                                  id: undefined,
                                  name: item.heroNpc.npcName,
                                  icon: item.heroNpc.npcIcon,
                                }}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {item.heroNpc.npcName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(new Date(item.killedAt))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("events.confirmation.deadline", "Do")}:{" "}
                                {formatDateTime(deadline)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
