import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
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
import {
  getListPendingParticipationConfirmationsQueryKey,
  useAcknowledgeExpiredParticipationConfirmations,
  useConfirmParticipationForKill,
  useListPendingParticipationConfirmations,
} from "@lootlog/api-client/react-query/main/events";
import { formatDateTime } from "../../utils/format-date";
import { invalidateKillQueries } from "../../hooks/mutations/invalidate-kill-queries";

interface EventParticipationConfirmationDialogProps {
  guildId?: string;
  eventId?: string;
}

export const EventParticipationConfirmationDialog = ({
  guildId,
  eventId,
}: EventParticipationConfirmationDialogProps) => {
  if (!guildId || !eventId) {
    return null;
  }

  return (
    <EventParticipationConfirmationDialogContent
      key={`${guildId}:${eventId}`}
      guildId={guildId}
      eventId={eventId}
    />
  );
};

const EventParticipationConfirmationDialogContent = ({
  guildId,
  eventId,
}: Required<EventParticipationConfirmationDialogProps>) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dismissedActiveKillIds, setDismissedActiveKillIds] = useState(
    () => new Set<string>(),
  );
  const [dismissedExpiredKillIds, setDismissedExpiredKillIds] = useState(
    () => new Set<string>(),
  );
  const [confirmingKillId, setConfirmingKillId] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now);

  const { data, isLoading } = useListPendingParticipationConfirmations({
    guildId,
    eventId,
  });
  const confirmParticipation = useConfirmParticipationForKill({
    mutation: {
      onSuccess: () => {
        invalidateKillQueries(queryClient, guildId, eventId);
      },
    },
  });
  const acknowledgeExpired = useAcknowledgeExpiredParticipationConfirmations();

  const pendingItems = data?.items ?? [];
  const activeItems = pendingItems
    .filter(
      (item) =>
        new Date(item.confirmationDeadlineAt).getTime() >= currentTimestamp,
    )
    .sort(
      (a, b) =>
        new Date(a.confirmationDeadlineAt).getTime() -
        new Date(b.confirmationDeadlineAt).getTime(),
    );
  const sortedItems = activeItems.filter(
    (item) => !dismissedActiveKillIds.has(item.killId),
  );
  const newlyExpiredItems = pendingItems.filter(
    (item) =>
      new Date(item.confirmationDeadlineAt).getTime() < currentTimestamp,
  );
  const sortedExpiredItems = [
    ...(data?.expiredItems ?? []),
    ...newlyExpiredItems,
  ]
    .filter((item) => !dismissedExpiredKillIds.has(item.killId))
    .sort(
      (a, b) =>
        new Date(b.confirmationDeadlineAt).getTime() -
        new Date(a.confirmationDeadlineAt).getTime(),
    );
  const nearestDeadlineTimestamp = activeItems[0]
    ? new Date(activeItems[0].confirmationDeadlineAt).getTime()
    : null;
  const open = sortedItems.length > 0 || sortedExpiredItems.length > 0;

  useEffect(() => {
    if (nearestDeadlineTimestamp === null) {
      return;
    }

    const timeoutMs = Math.max(0, nearestDeadlineTimestamp - Date.now() + 1);
    const timeoutId = window.setTimeout(() => {
      setCurrentTimestamp(Date.now());
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, [nearestDeadlineTimestamp]);

  const handleConfirm = async (killId: string) => {
    setConfirmingKillId(killId);
    try {
      await confirmParticipation.mutateAsync({
        pathParams: {
          guildId,
          eventId,
          killId,
        },
      });
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
    }
    setConfirmingKillId(null);
  };

  const handleConfirmAll = async () => {
    await Promise.all(sortedItems.map((item) => handleConfirm(item.killId)));
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (nextOpen) {
      return;
    }

    const activeKillIds = sortedItems.map((item) => item.killId);
    const expiredKillIds = sortedExpiredItems.map((item) => item.killId);

    setDismissedActiveKillIds((currentKillIds) => {
      return new Set([...currentKillIds, ...activeKillIds]);
    });
    setDismissedExpiredKillIds((currentKillIds) => {
      return new Set([...currentKillIds, ...expiredKillIds]);
    });

    if (expiredKillIds.length === 0) {
      return;
    }

    try {
      await acknowledgeExpired.mutateAsync({
        pathParams: {
          guildId,
          eventId,
        },
        data: {
          killIds: expiredKillIds,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: getListPendingParticipationConfirmationsQueryKey({
          guildId,
          eventId,
        }),
      });
    } catch {
      toast.error(t("events.confirmation.acknowledgeError"));
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails.reason === "outside-press") {
          eventDetails.cancel();
          return;
        }
        handleOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl p-5">
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
            <Spinner className="size-4" />
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
                          className="rounded-lg border border-border/70 bg-card px-3 py-2.5"
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
                                  {t("events.confirmation.deadline", "Do")}:{" "}
                                  {formatDateTime(deadline)} ({remaining})
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
                                <Spinner className="size-3.5" />
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
