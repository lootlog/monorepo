import type { CreateManualTimerOptions } from "@/api/timers.api";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";
import { parseDurationToSeconds } from "./add-timer-duration";
import type { AddTimerFormValues } from "./add-timer-form-schema";

export const DEFAULT_RESPAWN_RANDOMNESS = 10;

/** Min/max respawn window derived from the NPC's last known base respawn and randomness. */
export const getNpcRespawnWindowSeconds = (
  npc: Pick<
    SearchTimersNpcResponseDtoOutput,
    "latestRespBaseSeconds" | "latestRespawnRandomness"
  >,
) => {
  const baseSeconds = npc.latestRespBaseSeconds ?? 0;

  const respawnRandomness =
    npc.latestRespawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS;

  const variance = Math.round((baseSeconds * respawnRandomness) / 100);

  return {
    minSeconds: Math.max(baseSeconds - variance, 0),
    maxSeconds: baseSeconds + variance,
  };
};

type BuildCreateManualTimerPayloadInput = {
  values: AddTimerFormValues;
  world: string | undefined;
  guildId: string;
  selectedNpc: Pick<SearchTimersNpcResponseDtoOutput, "name" | "prof"> | null;
  customDatesEnabled: boolean;
};

/**
 * Returns `null` when the form has no target world or guild. The selected NPC's
 * profession is attached only while the name still matches that NPC.
 */
export const buildCreateManualTimerPayload = ({
  values,
  world,
  guildId,
  selectedNpc,
  customDatesEnabled,
}: BuildCreateManualTimerPayloadInput): CreateManualTimerOptions | null => {
  if (!world || !guildId) return null;

  const payload: CreateManualTimerOptions = {
    name: values.name,
    world,
    guildIds: [guildId],
  };

  if (values.lvl && values.lvl.length > 0) {
    payload.lvl = Number(values.lvl);
  }

  if (values.type) {
    payload.type = values.type;
  }

  if (selectedNpc?.name === values.name) {
    payload.prof = selectedNpc.prof;
  }

  if (customDatesEnabled && values.startDate && values.endDate) {
    payload.customMinSpawnTime = new Date(values.startDate);
    payload.customMaxSpawnTime = new Date(values.endDate);
  } else if (values.minDuration && values.maxDuration) {
    payload.minSeconds = parseDurationToSeconds(values.minDuration);
    payload.maxSeconds = parseDurationToSeconds(values.maxDuration);
  }

  return payload;
};
