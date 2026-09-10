import {
  getListPendingParticipationConfirmationsQueryKey,
  useAcknowledgeExpiredParticipationConfirmations,
  useConfirmParticipationForKill,
  useListPendingParticipationConfirmations,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invalidateKillQueries } from "../../hooks/mutations/invalidate-kill-queries";

export function useParticipationConfirmation({
  guildId,
  eventId,
}: {
  guildId: string;
  eventId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [dismissedActiveKillIds, setDismissedActiveKillIds] = useState(
    () => new Set<string>(),
  );

  const [dismissedExpiredKillIds, setDismissedExpiredKillIds] = useState(
    () => new Set<string>(),
  );

  const [confirmingKillIds, setConfirmingKillIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
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
    setConfirmingKillIds((ids) => new Set([...ids, killId]));

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

    setConfirmingKillIds((ids) => {
      const next = new Set(ids);
      next.delete(killId);

      return next;
    });
  };

  const handleConfirmAll = async () => {
    if (isConfirmingAll || confirmingKillIds.size > 0) return;
    setIsConfirmingAll(true);
    await Promise.allSettled(
      sortedItems.map((item) => handleConfirm(item.killId)),
    ).finally(() => setIsConfirmingAll(false));
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (isConfirmingAll || confirmingKillIds.size > 0) return;

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

  return {
    open,
    handleOpenChange,
    t,
    isLoading,
    sortedItems,
    isConfirmingAll,
    confirmingKillIds,
    confirmParticipation,
    handleConfirm,
    handleConfirmAll,
    sortedExpiredItems,
  };
}
