import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import {
  type EventOverviewResponseDto,
  getListEventsQueryKey,
  getShowEventOverviewQueryKey,
  useDeleteEvent,
  useShowEventOverview,
  useUpdateEvent,
} from "@lootlog/client/main";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import { Permission } from "@lootlog/schema/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { canManageEvent } from "./utils/event-access";
import {
  EVENT_STATUS_PRESENTATION,
  getEventStatusAtTimestamp,
} from "./utils/event-activity";
import { formatDateRange } from "./utils/format-date";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { invalidateEventDetailQueries } from "./hooks/mutations/invalidate-event-queries";
import { useToggleEventPin } from "./hooks/mutations/use-toggle-event-pin";

type EventOverview = EventOverviewResponseDto;

type Translator = ReturnType<typeof useTranslation>["t"];

const getEventDateRangeLabel = (
  event: EventOverview | undefined,
  t: Translator,
) => {
  if (!event) return "";

  return formatDateRange(
    new Date(event.startsAt || event.createdAt),
    event.endsAt ? new Date(event.endsAt) : null,
    t("events.ongoing"),
  );
};

const getEventStatusView = (
  event: EventOverview | undefined,
  timestamp: number,
  eventIsPinned: boolean,
  t: Translator,
) => {
  const status = event ? getEventStatusAtTimestamp(event, timestamp) : "ended";
  let pinActionLabel = t("events.pinEvent");

  if (status !== "active") {
    pinActionLabel = t("events.pinUnavailable");
  } else if (eventIsPinned) {
    pinActionLabel = t("events.unpinEvent");
  }

  const { labelKey, badgeVariant } = EVENT_STATUS_PRESENTATION[status];

  return {
    isActive: status === "active",
    pinActionLabel,
    statusLabel: t(labelKey),
    statusVariant: badgeVariant,
  };
};

const getEventScoring = (event: EventOverview | undefined) => {
  const scoringMode = normalizeEventScoringMode(event?.scoringMode);

  return {
    scoringMode,
    scoringRules:
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(event?.scoringRules)
        : null,
  };
};

/**
 * What every page of an event opens with: the event, its status and pin, and
 * the actions on the whole event with their dialogs.
 */
export const useEventHeader = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });
  const queryGuildId = guildId ?? "";
  const queryEventId = eventId ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentTimestamp = useMinuteTimestamp();

  const {
    togglePin,
    isPinned,
    isPending: isPinPending,
  } = useToggleEventPin(queryGuildId);

  const eventIsPinned = eventId ? isPinned(eventId) : false;

  const {
    data: event,
    isError: isEventError,
    isFetching: isEventFetching,
    refetch: refetchEvent,
  } = useShowEventOverview(
    { guildId: queryGuildId, eventId: queryEventId },
    {
      query: {
        enabled: Boolean(guildId && eventId),
        queryKey: getShowEventOverviewQueryKey({
          guildId: queryGuildId,
          eventId: queryEventId,
        }),
      },
    },
  );

  const { data: accessPolicy } = useGuildPermissions();

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        if (!guildId || !eventId) return;

        invalidateEventDetailQueries(queryClient, guildId, eventId);
      },
    },
  });

  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        if (!guildId) return;

        queryClient.invalidateQueries({
          queryKey: getListEventsQueryKey({ guildId }),
        });
      },
    },
  });

  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  const { scoringMode, scoringRules } = getEventScoring(event);

  const {
    isActive: isEventActive,
    pinActionLabel,
    statusLabel: eventStatusLabel,
    statusVariant: eventStatusVariant,
  } = getEventStatusView(event, currentTimestamp, eventIsPinned, t);

  const navigateToEventEdit = () => {
    navigate({
      to: "/$guildId/events/$eventId/edit",
      params: { guildId: queryGuildId, eventId: queryEventId },
    });
  };

  const openEventStatusDialog = () => {
    if (isEventActive) {
      setEndDialogOpen(true);

      return;
    }

    setResumeDialogOpen(true);
  };

  return {
    t,
    event,
    isEventError,
    isEventFetching,
    refetchEvent,
    eventId,
    queryGuildId,
    queryEventId,
    navigate,
    updateEvent,
    deleteEvent,
    canManage: canManageEvent(accessPolicy),
    canDeleteEvent: Boolean(
      accessPolicy?.allows(Permission.ADMIN) ||
      accessPolicy?.allows(Permission.OWNER),
    ),
    endDialogOpen,
    setEndDialogOpen,
    resumeDialogOpen,
    setResumeDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    rulesDialogOpen,
    setRulesDialogOpen,
    summaryDialogOpen,
    setSummaryDialogOpen,
    scoringMode,
    scoringRules,
    eventStatusVariant,
    eventStatusLabel,
    eventDateRangeLabel: getEventDateRangeLabel(event, t),
    isPinPending,
    eventIsPinned,
    pinActionLabel,
    isEventActive,
    togglePin,
    navigateToEventEdit,
    openEventStatusDialog,
  };
};
