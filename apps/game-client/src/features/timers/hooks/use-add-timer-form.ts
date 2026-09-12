import { type FormEvent, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";
import { useCreateManualTimer } from "@/hooks/api/use-create-manual-timer";
import { useWindowsStore } from "@/store/windows.store";
import { useGameStore } from "@/store/game.store";
import {
  type AddTimerFormValues,
  createAddTimerFormSchema,
  resolveManualTimerNpcType,
} from "@/features/timers/model/add-timer-form-schema";
import { formatSecondsToDuration } from "@/features/timers/model/add-timer-duration";
import {
  buildCreateManualTimerPayload,
  getNpcRespawnWindowSeconds,
} from "@/features/timers/model/add-timer-submit";
import { useAddTimerGuildSelection } from "./use-add-timer-guild-selection";
import { useNpcTimerSearch } from "./use-npc-timer-search";

export type AddTimerFormProps = {
  initialGuildId?: string;
};

export function useAddTimerForm({ initialGuildId }: AddTimerFormProps) {
  const { t } = useTranslation("timers");
  const { mutate: createManualTimer, isPending } = useCreateManualTimer();
  const world = useGameStore((state) => state.game?.world ?? "unknown");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const guild = useAddTimerGuildSelection(initialGuildId);

  const npcSearch = useNpcTimerSearch({
    guildId: guild.selectedGuildId,
    world,
  });

  const [customDatesEnabled, setCustomDatesEnabled] = useState(false);
  const selectedNpcRef = useRef<SearchTimersNpcResponseDtoOutput | null>(null);

  const form = useForm<AddTimerFormValues>({
    resolver: zodResolver(createAddTimerFormSchema(t)),
    defaultValues: {
      name: "",
      minDuration: "",
      maxDuration: "",
      lvl: "",
      type: "",
      startDate: "",
      endDate: "",
    },
  });

  const [startDate, endDate] = useWatch({
    control: form.control,
    name: ["startDate", "endDate"],
  });

  const clearSelectedNpc = () => {
    selectedNpcRef.current = null;
  };

  const handleNpcSelect = (npc: SearchTimersNpcResponseDtoOutput) => {
    const { minSeconds, maxSeconds } = getNpcRespawnWindowSeconds(npc);

    form.setValue("name", npc.name);
    form.setValue("minDuration", formatSecondsToDuration(minSeconds));
    form.setValue("maxDuration", formatSecondsToDuration(maxSeconds));
    form.setValue("lvl", String(npc.lvl));
    form.setValue("type", resolveManualTimerNpcType(npc.type));
    selectedNpcRef.current = npc;
    npcSearch.reset();
  };

  const handleCustomDatesToggle = (enabled: boolean) => {
    setCustomDatesEnabled(enabled);

    if (enabled) {
      form.setValue("minDuration", "");
      form.setValue("maxDuration", "");
    } else {
      form.setValue("startDate", "");
      form.setValue("endDate", "");
    }
  };

  const onSubmit = (values: AddTimerFormValues) => {
    const payload = buildCreateManualTimerPayload({
      values,
      world,
      guildId: guild.selectedGuildId,
      selectedNpc: selectedNpcRef.current,
      customDatesEnabled,
    });

    if (!payload) return;

    createManualTimer(payload, {
      onSuccess: () => {
        setOpen("add-timer", false);
      },
    });
  };

  return {
    form,
    npcSearch: { ...npcSearch, select: handleNpcSelect, clearSelectedNpc },
    guild,
    dates: {
      customDatesEnabled,
      startDate,
      endDate,
      toggle: handleCustomDatesToggle,
    },
    submit: (event: FormEvent<HTMLFormElement>) =>
      form.handleSubmit(onSubmit)(event),
    isPending,
  };
}
