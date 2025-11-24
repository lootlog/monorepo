import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/guilds/use-guild-permissions";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import {
  useReservations,
  type Reservation,
} from "@/hooks/api/reservations/use-reservations";
import { useCreateReservation } from "@/hooks/api/reservations/use-create-reservation";
import { useDeleteReservation } from "@/hooks/api/reservations/use-delete-reservation";
import { useSession } from "@/hooks/auth/use-session";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { DatePicker } from "./date-picker";
import { toast } from "sonner";
import { reservationSlug } from "./reservation-slug";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

const LABEL_COLUMN_WIDTH = 80;

const formatTime = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

const formatSegmentTime = (date: Date, reference: Date) => {
  const isSameDay =
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate();

  if (isSameDay) {
    return formatTime(date);
  }

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month} ${formatTime(date)}`;
};

const formatDateWithTime = (date: Date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}.${month} ${formatTime(date)}`;
};

const shouldShowEndDateOnFirstSegment = (
  segment: ReservationSegment,
): boolean => {
  if (!segment.isReservationStart) {
    return false;
  }

  const reservationEnd = segment.reservation.toDate;
  const segmentStart = segment.segmentStart;

  return !(
    reservationEnd.getFullYear() === segmentStart.getFullYear() &&
    reservationEnd.getMonth() === segmentStart.getMonth() &&
    reservationEnd.getDate() === segmentStart.getDate()
  );
};

type ReservationSegment = {
  reservation: Reservation;
  id: string;
  dayIdx: number;
  startHour: number;
  durationHours: number;
  segmentStart: Date;
  segmentEnd: Date;
  isReservationStart: boolean;
};

export const ReservationsSchedule: React.FC = () => {
  const { reservationId } = useParams({
    from: "/_authenticated/$guildId/reservations/$reservationId",
  });
  const { data: members } = useGuildMembers(false);
  const { data: session } = useSession();
  const { data: permissions } = useGuildPermissions();
  const isOwner = useIsOwner();
  const guildId = useGuildId();
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const { data: reservations } = useReservations();
  const { mutateAsync: createReservation, isPending: isCreating } =
    useCreateReservation();
  const { mutateAsync: deleteReservation, isPending: isDeleting } =
    useDeleteReservation();

  const canModerateReservations = useMemo(() => {
    if (isOwner) {
      return true;
    }

    if (!permissions) {
      return false;
    }

    return (
      permissions.includes(Permission.LOOTLOG_MANAGE) ||
      permissions.includes(Permission.ADMIN)
    );
  }, [permissions, isOwner]);

  function getISOWeek(date = new Date()) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNumber =
      1 +
      Math.ceil((Number(firstThursday) - Number(target.valueOf())) / 604800000);
    return weekNumber;
  }

  function getLastISOWeek(year: number) {
    return getISOWeek(new Date(year, 11, 28));
  }

  const today = new Date();
  const initialYear = today.getFullYear();
  const initialWeek = getISOWeek(today);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentWeek, setCurrentWeek] = useState(initialWeek);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
  const [isToPickerOpen, setIsToPickerOpen] = useState(false);
  const [comment, setComment] = useState("");
  const currentUserId = session?.user?.discordId;

  const normalizedReservationId = reservationId
    ? reservationSlug(reservationId)
    : undefined;

  const RESERVATION_NAME_BY_SLUG: Record<string, string> = Object.keys(
    reservations ?? {},
  ).reduce<Record<string, string>>((acc, name) => {
    acc[reservationSlug(name)] = name;
    return acc;
  }, {});

  const reservationKey = normalizedReservationId
    ? (RESERVATION_NAME_BY_SLUG[normalizedReservationId] ??
      Object.keys(reservations ?? {}).find(
        (name) => reservationSlug(name) === normalizedReservationId,
      ) ??
      Object.keys(reservations ?? {}).find(
        (name) => name.toLowerCase() === reservationId?.toLowerCase(),
      ))
    : undefined;
  const createReservationKey =
    reservationKey ?? normalizedReservationId ?? reservationId ?? "";

  type ReservationGatewayPayload = {
    guildId: string;
    reservation: {
      reservationId: string;
    };
  };

  useEffect(() => {
    if (!guildId || !connected) {
      return;
    }

    const handleReservationEvent = (payload: ReservationGatewayPayload) => {
      if (payload.guildId !== guildId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["reservations", guildId],
      });
    };

    socket.on(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
    socket.on(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);

    return () => {
      socket.off(GatewayEvent.RESERVATIONS_CREATE, handleReservationEvent);
      socket.off(GatewayEvent.RESERVATIONS_DELETE, handleReservationEvent);
    };
  }, [connected, guildId, queryClient, socket]);

  useEffect(() => {
    if (!isCreateDialogOpen) {
      setComment("");
    }
  }, [isCreateDialogOpen]);

  const handleCreateReservation = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error("Wybierz zakres czasowy rezerwacji.", {
        position: "bottom-right",
      });
      return;
    }

    if (fromDate >= toDate) {
      toast.error("Data zakończenia musi być późniejsza niż rozpoczęcia.", {
        position: "bottom-right",
      });
      return;
    }

    if (!createReservationKey) {
      toast.error("Nie udało się ustalić rodzaju rezerwacji.", {
        position: "bottom-right",
      });
      return;
    }

    if (!currentUserId) {
      toast.error("Brak informacji o użytkowniku.", {
        position: "bottom-right",
      });
      return;
    }

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (fromDate.getTime() < oneHourAgo) {
      toast.error(
        "Godzina rozpoczęcia rezerwacji nie może być starsza niż 1 godzina od aktualnego czasu.",
        { position: "bottom-right" },
      );
      return;
    }

    const minimumDurationMs = 30 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() < minimumDurationMs) {
      toast.error("Rezerwacja musi trwać co najmniej 30 minut.", {
        position: "bottom-right",
      });
      return;
    }

    try {
      const normalizedComment = comment.trim();
      await createReservation({
        reservationId: createReservationKey,
        createdDate: new Date(),
        fromDate,
        toDate,
        createdBy: currentUserId,
        comment: normalizedComment.length > 0 ? normalizedComment : undefined,
      });
      toast.success("Rezerwacja została utworzona.", {
        position: "bottom-right",
      });
      setIsCreateDialogOpen(false);
      setFromDate(undefined);
      setToDate(undefined);
      setIsFromPickerOpen(false);
      setIsToPickerOpen(false);
      setComment("");
    } catch (error) {
      const fallbackMessage = "Nie udało się utworzyć rezerwacji.";
      if (error && typeof error === "object" && "response" in error) {
        const maybeAxiosError = error as {
          response?: {
            data?: { message?: string | string[] };
            status?: number;
          };
        };
        const rawMessage = maybeAxiosError.response?.data?.message;
        const normalizedMessage = Array.isArray(rawMessage)
          ? rawMessage[0]
          : rawMessage;
        const message =
          typeof normalizedMessage === "string" ? normalizedMessage : undefined;
        toast.error(message ?? fallbackMessage, {
          position: "bottom-right",
        });
      } else if (error instanceof Error) {
        const message = error.message || undefined;
        toast.error(message || fallbackMessage, {
          position: "bottom-right",
        });
      } else {
        toast.error(fallbackMessage, {
          position: "bottom-right",
        });
      }
    }
  }, [
    fromDate,
    toDate,
    createReservationKey,
    currentUserId,
    createReservation,
    comment,
  ]);

  const handleDeleteReservation = useCallback(
    async (reservationRecordId: number, action: "cancel" | "remove") => {
      const successMessage =
        action === "cancel"
          ? "Rezerwacja została anulowana."
          : "Rezerwacja została usunięta.";
      const fallbackMessage =
        action === "cancel"
          ? "Nie udało się anulować rezerwacji."
          : "Nie udało się usunąć rezerwacji.";

      try {
        await deleteReservation({ reservationRecordId });
        toast.success(successMessage, { position: "bottom-right" });
      } catch (error) {
        if (error && typeof error === "object" && "response" in error) {
          const maybeAxiosError = error as {
            response?: { data?: { message?: string | string[] } };
          };
          const rawMessage = maybeAxiosError.response?.data?.message;
          const normalizedMessage = Array.isArray(rawMessage)
            ? rawMessage[0]
            : rawMessage;
          const message =
            typeof normalizedMessage === "string"
              ? normalizedMessage
              : undefined;
          toast.error(message ?? fallbackMessage, {
            position: "bottom-right",
          });
        } else if (error instanceof Error) {
          const message = error.message || undefined;
          toast.error(message || fallbackMessage, {
            position: "bottom-right",
          });
        } else {
          toast.error(fallbackMessage, {
            position: "bottom-right",
          });
        }
      }
    },
    [deleteReservation],
  );

  const handlePrevWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(currentWeek - 1);
    } else {
      const prevYear = currentYear - 1;
      setCurrentYear(prevYear);
      setCurrentWeek(getLastISOWeek(prevYear));
    }
  };

  const handleNextWeek = () => {
    const lastWeek = getLastISOWeek(currentYear);
    if (currentWeek < lastWeek) {
      setCurrentWeek(currentWeek + 1);
    } else {
      setCurrentYear(currentYear + 1);
      setCurrentWeek(1);
    }
  };

  function getDateOfISOWeek(week: number, year: number) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }

  const monthNames = [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień",
  ];
  const weekStart = getDateOfISOWeek(currentWeek, currentYear);
  const weekStartTimestamp = weekStart.getTime();
  const monthName = monthNames[weekStart.getMonth()];

  const days = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

  const hours = Array.from(
    { length: 24 },
    (_, i) => `${i.toString().padStart(2, "0")}:00`,
  );

  const selectedReservations: Reservation[] = reservationKey
    ? (reservations?.[reservationKey] ?? [])
    : [];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const reservationsInWeek = selectedReservations.filter(
    (reservation) =>
      reservation.toDate > weekStart && reservation.fromDate < weekEnd,
  );

  const membersByUserId = useMemo(() => {
    if (!members) {
      return new Map<string, GuildMember>();
    }

    return new Map<string, GuildMember>(
      members.map((member) => [member.userId, member]),
    );
  }, [members]);

  const reservationSegments = useMemo(() => {
    const segments: ReservationSegment[] = [];

    reservationsInWeek.forEach((reservation, reservationIndex) => {
      const reservationUniqueId = `${reservationIndex}-${reservation.createdDate.getTime()}-${reservation.fromDate.getTime()}-${reservation.toDate.getTime()}`;

      for (let dayIdx = 0; dayIdx < days.length; dayIdx += 1) {
        const dayStart = new Date(weekStartTimestamp);
        dayStart.setDate(dayStart.getDate() + dayIdx);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        if (reservation.toDate <= dayStart || reservation.fromDate >= dayEnd) {
          continue;
        }

        const segmentStart =
          reservation.fromDate > dayStart
            ? new Date(reservation.fromDate)
            : new Date(dayStart);
        const segmentEnd =
          reservation.toDate < dayEnd
            ? new Date(reservation.toDate)
            : new Date(dayEnd);

        const startHour =
          (segmentStart.getTime() - dayStart.getTime()) / 3_600_000;
        const durationHours =
          (segmentEnd.getTime() - segmentStart.getTime()) / 3_600_000;

        if (durationHours <= 0) {
          continue;
        }

        const clampedStartHour = Math.max(0, Math.min(hours.length, startHour));
        const clampedDuration = Math.max(
          0,
          Math.min(hours.length - clampedStartHour, durationHours),
        );

        if (clampedDuration <= 0) {
          continue;
        }

        segments.push({
          reservation,
          id: reservationUniqueId,
          dayIdx,
          startHour: clampedStartHour,
          durationHours: clampedDuration,
          segmentStart,
          segmentEnd,
          isReservationStart:
            segmentStart.getTime() === reservation.fromDate.getTime(),
        });
      }
    });

    return segments;
  }, [days.length, hours.length, reservationsInWeek, weekStartTimestamp]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0 max-h-full overflow-hidden bg-background">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="text-xs font-semibold"
          >
            Dodaj rezerwację
          </Button>
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-muted rounded-lg transition-colors"
              onClick={handlePrevWeek}
              aria-label="Poprzedni tydzień"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium min-w-28 text-center">
              Tydzień {currentWeek} ({currentYear}, {monthName})
            </span>
            <button
              className="p-1 hover:bg-muted rounded-lg transition-colors"
              onClick={handleNextWeek}
              aria-label="Następny tydzień"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent
            className="max-w-md translate-y-[-35%] sm:translate-y-[-100%]"
            aria-describedby={undefined}
          >
            <DialogHeader>
              <DialogTitle>Dodaj rezerwację</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-3 ml-3 mr-3 mb-4">
              <DatePicker
                label="Data rozpoczęcia"
                placeholder="Wybierz początek rezerwacji"
                date={fromDate}
                setDate={(date) => setFromDate(date)}
                open={isFromPickerOpen}
                setOpen={setIsFromPickerOpen}
                onClear={() => setFromDate(undefined)}
              />
              <DatePicker
                label="Data zakończenia"
                placeholder="Wybierz koniec rezerwacji"
                date={toDate}
                setDate={(date) => setToDate(date)}
                open={isToPickerOpen}
                setOpen={setIsToPickerOpen}
                onClear={() => setToDate(undefined)}
              />
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor="reservation-comment"
                >
                  Komentarz (opcjonalnie)
                </label>
                <Textarea
                  id="reservation-comment"
                  maxLength={128}
                  placeholder="Dodaj krótki komentarz do rezerwacji"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="min-h-[58px] max-h-[58px] resize-none"
                  rows={2}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {comment.trim().length}/{128}
                </p>
              </div>
            </div>
            <DialogFooter className="mt-0 mb-2 mr-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  !fromDate ||
                  !toDate ||
                  !createReservationKey ||
                  !currentUserId ||
                  isCreating
                }
                onClick={handleCreateReservation}
              >
                Zapisz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex-1 flex flex-col min-h-0 max-h-full h-full overflow-hidden">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="bg-background" />
            {days.map((day, idx) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + idx);
              const dayNumber = date.getDate();
              return (
                <div
                  key={day}
                  className="border-l border-border flex flex-col items-center justify-center py-1"
                  style={{ minWidth: 0 }}
                >
                  <span className="text-xs text-muted-foreground">{day}</span>
                  <span className="text-xs font-semibold text-primary mt-1">
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 max-h-full overflow-y-auto">
            <div
              className="relative grid w-full h-full min-h-full max-h-full"
              style={{
                gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`,
                gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`,
              }}
            >
              {hours.map((hour, _) => [
                <div
                  key={`label-${hour}`}
                  className="text-xs font-medium text-center px-2 text-muted-foreground border-b border-border flex items-center justify-center bg-muted min-h-0"
                  style={{ minWidth: 0 }}
                >
                  {hour}
                </div>,
                ...days.map((day, dayIdx) => {
                  const backgroundClass =
                    dayIdx % 2 === 0 ? "bg-background" : "bg-muted";

                  return (
                    <div
                      key={`${hour}-${day}`}
                      className={`relative border-l border-b border-border min-h-0 h-full ${backgroundClass}`}
                      style={{ minWidth: 0, overflow: "hidden" }}
                    />
                  );
                }),
              ])}
              {reservationSegments.map((segment) => {
                const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${days.length}`;
                const leftExpression = `calc(${LABEL_COLUMN_WIDTH}px + (${segment.dayIdx} * ${dayWidthExpr}) + 3px)`;
                const widthExpression = `calc(${dayWidthExpr} - 6px)`;
                const topPercent = Math.max(
                  0,
                  Math.min(100, (segment.startHour / hours.length) * 100),
                );
                const heightPercent = Math.max(
                  1,
                  Math.min(100, (segment.durationHours / hours.length) * 100),
                );

                const member = membersByUserId.get(
                  segment.reservation.createdBy,
                );
                const memberName =
                  member?.name ?? segment.reservation.createdBy;
                const avatarUrl = getDiscordAvatarUrl(
                  member?.userId,
                  member?.avatar,
                  64,
                );
                const fallbackInitial = memberName?.[0]?.toUpperCase() ?? "?";
                const segmentKey = `${segment.id}-${segment.dayIdx}-${segment.segmentStart.getTime()}`;
                const canCancelReservation =
                  segment.reservation.createdBy === currentUserId;
                const canRemoveReservation = canModerateReservations;
                const showContextMenu =
                  canCancelReservation || canRemoveReservation;
                const displayStartLabel = formatSegmentTime(
                  segment.reservation.fromDate,
                  segment.segmentStart,
                );
                const baseEndReference = shouldShowEndDateOnFirstSegment(
                  segment,
                )
                  ? segment.reservation.fromDate
                  : segment.segmentEnd;
                const displayEndLabel = formatSegmentTime(
                  segment.reservation.toDate,
                  baseEndReference,
                );
                const createdLabel = formatDateWithTime(
                  segment.reservation.createdDate,
                );
                const trimmedComment = segment.reservation.comment?.trim();
                const hasComment = Boolean(trimmedComment?.length);
                const allowsInteraction = showContextMenu || hasComment;

                const segmentElement = (
                  <div
                    className={`absolute z-10 overflow-hidden rounded-md border border-primary/40 bg-primary/95 text-[10px] font-medium text-primary-foreground shadow-sm ${allowsInteraction ? "pointer-events-auto" : "pointer-events-none"}`}
                    style={{
                      left: leftExpression,
                      width: widthExpression,
                      top: `calc(${topPercent}% + 1px)`,
                      height: `calc(${heightPercent}% - 2px)`,
                    }}
                  >
                    <div className="relative flex h-full flex-col justify-center gap-1 p-2 pr-10">
                      <div className="flex items-center gap-2">
                        <Avatar className="pointer-events-none size-6 border border-primary-foreground/30">
                          <AvatarImage src={avatarUrl} alt={memberName} />
                          <AvatarFallback>{fallbackInitial}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] font-semibold leading-tight">
                          {memberName}
                        </span>
                      </div>
                      {hasComment && trimmedComment && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-primary/70 px-1.5 py-0.5 text-[9px] font-semibold">
                              <MessageSquareText
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                              Komentarz
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="start"
                            className="max-w-xs break-words text-xs"
                          >
                            {trimmedComment}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span className="absolute top-1 right-1 rounded bg-primary/70 px-1.5 py-0.5 text-[9px] font-semibold">
                        {displayStartLabel}
                      </span>
                      <span className="absolute bottom-1 right-1 rounded bg-primary/70 px-1.5 py-0.5 text-[9px] font-semibold">
                        {displayEndLabel}
                      </span>
                      <span className="absolute bottom-1 left-1 rounded bg-primary/70 px-1.5 py-0.5 text-[9px] font-semibold">
                        Dodano {createdLabel}
                      </span>
                    </div>
                  </div>
                );

                if (showContextMenu) {
                  return (
                    <ContextMenu key={segmentKey}>
                      <ContextMenuTrigger asChild>
                        {segmentElement}
                      </ContextMenuTrigger>
                      <ContextMenuContent className="min-w-[12rem]">
                        {canCancelReservation && (
                          <ContextMenuItem
                            className="group gap-2 data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
                            disabled={isDeleting}
                            onSelect={() => {
                              void handleDeleteReservation(
                                segment.reservation.id,
                                "cancel",
                              );
                            }}
                          >
                            <Ban className="h-4 w-4 text-muted-foreground transition-colors group-data-[highlighted]:text-foreground" />
                            Anuluj rezerwację
                          </ContextMenuItem>
                        )}
                        {canCancelReservation && canRemoveReservation && (
                          <ContextMenuSeparator />
                        )}
                        {canRemoveReservation && (
                          <ContextMenuItem
                            className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                            disabled={isDeleting}
                            onSelect={() => {
                              void handleDeleteReservation(
                                segment.reservation.id,
                                "remove",
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            Usuń rezerwację
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                }

                return <Fragment key={segmentKey}>{segmentElement}</Fragment>;
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
