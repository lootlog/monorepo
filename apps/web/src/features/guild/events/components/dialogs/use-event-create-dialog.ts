import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getListEventsQueryKey,
  useCreateEvent,
  type EventListItemResponseDto,
} from "@lootlog/client/main";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringMode,
  type EventScoringRules,
} from "@lootlog/domain/scoring";

import { getApiErrorMessage } from "@lootlog/client/transport";

export interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  world: string;
  startsAt?: Date;
  endsAt?: Date;
  participationConfirmationMinutes: number;
  rulebookMarkdown: string;
  scoringMode: EventScoringMode;
  scoringRules: EventScoringRules;
}

const getDefaultValues = (): FormData => ({
  name: "",
  world: "",
  startsAt: new Date(),
  endsAt: undefined,
  participationConfirmationMinutes: 0,
  rulebookMarkdown: "",
  scoringMode: "SIMPLE",
  scoringRules: normalizeEventScoringRules(
    DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  ),
});

export function useEventCreateDialog({ onOpenChange }: EventCreateDialogProps) {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListEventsQueryKey({ guildId: guildId ?? "" }),
        });
      },
    },
  });
  const [step, setStep] = useState<1 | 2>(1);

  const form = useForm<FormData>({
    defaultValues: getDefaultValues(),
  });

  const scoringMode = normalizeEventScoringMode(form.watch("scoringMode"));

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset(getDefaultValues());
      setStep(1);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = (data: FormData) => {
    if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) {
      toast.error(
        t(
          "events.createDialog.endDateMustBeAfterStart",
          "Data końca musi być po dacie startu",
        ),
      );
      return;
    }

    if (!data.name.trim() || !data.world.trim()) {
      toast.error(
        t(
          "events.createDialog.nameWorldRequired",
          "Nazwa eventu i świat są wymagane",
        ),
      );
      return;
    }

    const normalizedMode = normalizeEventScoringMode(data.scoringMode);

    const request: Parameters<typeof createEvent.mutate>[0]["data"] = {
      name: data.name.trim(),
      world: data.world.trim(),
      startsAt: data.startsAt?.toISOString(),
      endsAt: data.endsAt?.toISOString(),
      participationConfirmationMinutes: Number.isFinite(
        data.participationConfirmationMinutes,
      )
        ? Math.max(0, Math.round(data.participationConfirmationMinutes))
        : 0,
      scoringMode: normalizedMode,
    };
    if (data.rulebookMarkdown?.trim().length)
      request.rulebookMarkdown = data.rulebookMarkdown.trim();
    if (normalizedMode === "ADVANCED")
      request.scoringRules = normalizeEventScoringRules(data.scoringRules);

    createEvent.mutate(
      {
        pathParams: {
          guildId: guildId ?? "",
        },
        data: request,
      },
      {
        onSuccess: (eventData) => {
          if (guildId) {
            const listEventsQueryKey = getListEventsQueryKey(
              { guildId },
              { activeOnly: "false" },
            );

            queryClient.setQueryData<EventListItemResponseDto[]>(
              listEventsQueryKey,
              (currentEvents) =>
                currentEvents
                  ? [
                      eventData,
                      ...currentEvents.filter(
                        (event) => event.id !== eventData.id,
                      ),
                    ]
                  : [eventData],
            );
          }

          toast.success(t("events.createDialog.success"));
          handleClose(false);
          navigate({ to: `/${guildId}/events/${eventData.id}` });
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error) ?? t("events.createDialog.error"),
          );
        },
      },
    );
  };

  return {
    createEvent,
    handleClose,
    t,
    step,
    scoringMode,
    form,
    onSubmit,
    setStep,
  };
}
