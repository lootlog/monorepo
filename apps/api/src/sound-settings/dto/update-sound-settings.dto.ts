import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const NpcTypeSoundConfigSchema = z.object({
  volume: z.number().min(0).max(1).optional(),
  soundUrl: z.union([z.literal(""), z.string().url()]).optional(),
});

const SoundConfigMapSchema = z.object({
  ELITE2: NpcTypeSoundConfigSchema.optional(),
  HERO: NpcTypeSoundConfigSchema.optional(),
  TITAN: NpcTypeSoundConfigSchema.optional(),
  COLOSSUS: NpcTypeSoundConfigSchema.optional(),
  message: NpcTypeSoundConfigSchema.optional(),
});

const UpdateSoundSettingsSchema = z.object({
  masterVolume: z.number().min(0).max(1).optional(),
  notificationsVolume: z.number().min(0).max(1).optional(),
  detectorVolume: z.number().min(0).max(1).optional(),
  timersVolume: z.number().min(0).max(1).optional(),
  pingsVolume: z.number().min(0).max(1).optional(),
  notificationsConfig: SoundConfigMapSchema.optional(),
  detectorConfig: SoundConfigMapSchema.optional(),
  timersConfig: SoundConfigMapSchema.optional(),
});

export class UpdateSoundSettingsDto extends createZodDto(
  UpdateSoundSettingsSchema,
) {}
