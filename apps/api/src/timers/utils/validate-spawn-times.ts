import { BadRequestException } from "@nestjs/common";
import type { CreateTimerFromGameClientDto } from "#src/timers/dto/create-timer-from-game-client.dto";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { TIMER_LIMITS } from "#src/timers/constants/timer-limits";
import { DEFAULT_RESPAWN_RANDOMNESS } from "#src/timers/constants/respawn";

interface SpawnTimes {
  minSpawnTime: Date;
  maxSpawnTime: Date;
}

function calculateRespawnTime(
  respBaseSeconds: number,
  respawnRandomness: number,
  now: Date,
): SpawnTimes {
  const date = now.getTime();
  const respMs = respBaseSeconds * 1000;
  const multiplier = respawnRandomness / 100;
  const maxSpawnTime = Math.round(respMs * multiplier + respMs);
  const minSpawnTime = Math.round(respMs - respMs * multiplier);
  return {
    minSpawnTime: new Date(date + minSpawnTime),
    maxSpawnTime: new Date(date + maxSpawnTime),
  };
}

export function validateAndCalculateSpawnTimes(
  dto: CreateTimerFromGameClientDto,
  now: Date = new Date(),
): SpawnTimes {
  if (dto.customMinSpawnTime && dto.customMaxSpawnTime) {
    const customMin = new Date(dto.customMinSpawnTime);
    const customMax = new Date(dto.customMaxSpawnTime);

    if (customMax <= customMin) {
      throw new BadRequestException({
        message: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
      });
    }

    if (customMin < now) {
      throw new BadRequestException({
        message: ErrorKey.SPAWN_TIME_IN_PAST,
      });
    }

    const maxDurationMs =
      TIMER_LIMITS.MAX_SPAWN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const duration = customMax.getTime() - customMin.getTime();

    if (duration > maxDurationMs) {
      throw new BadRequestException({
        message: ErrorKey.SPAWN_WINDOW_TOO_LARGE,
      });
    }

    return {
      minSpawnTime: customMin,
      maxSpawnTime: customMax,
    };
  }

  return calculateRespawnTime(
    dto.respBaseSeconds,
    dto.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
    now,
  );
}
