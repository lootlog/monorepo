import { DEFAULT_RESPAWN_RANDOMNESS } from "@/features/timers/constants/default-respawn-randomness";
import { MAX_DURATION_SECONDS } from "@/features/timers/constants/max-duration-seconds";

export const parseDurationToSeconds = (input: string): number => {
  const regex = /(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i;
  const match = input.match(regex);
  if (!match) return 0;

  const [, hours, minutes, seconds] = match.map(Number);
  const totalSeconds =
    (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);

  return Math.min(totalSeconds, MAX_DURATION_SECONDS);
};

export function calculateMaxOffsetFromMinOffset(
  minOffsetSeconds: number,
  respawnRandomness: number = DEFAULT_RESPAWN_RANDOMNESS
): number {
  const multiplier = respawnRandomness / 100;
  return Math.round((minOffsetSeconds * (1 + multiplier)) / (1 - multiplier));
}

export function formatSecondsToHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function calculateRespBaseSecondsFromMinOffset(
  minOffsetSeconds: number,
  respawnRandomness: number = DEFAULT_RESPAWN_RANDOMNESS
): number {
  const multiplier = respawnRandomness / 100;
  const baseSeconds = minOffsetSeconds / (1 - multiplier);

  return Math.round(baseSeconds);
}
