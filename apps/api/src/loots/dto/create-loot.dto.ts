import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { LootSource } from "src/generated/prisma/client";

const LootSchema = z.object({
  hid: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  pr: z.number(),
  prc: z.string().min(1),
  stat: z.string().min(1),
  id: z.number(),
  cl: z.number(),
  own: z.number().optional(),
});

export class LootDto extends createZodDto(LootSchema) {}

const PlayerSchema = z.object({
  id: z.number(),
  accountId: z.number(),
  name: z.string().min(1),
  lvl: z.number(),
  prof: z.string().min(1),
  icon: z.string().min(1),
  hpp: z.number().optional(),
});

export class PlayerDto extends createZodDto(PlayerSchema) {}

const NpcSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  location: z.string().min(1),
  lvl: z.number(),
  prof: z.string().optional(),
  wt: z.number(),
  hpp: z.number().optional(),
  icon: z.string().min(1),
  type: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export class NpcDto extends createZodDto(NpcSchema) {}

const CreateLootSchema = z.object({
  loots: z.array(LootSchema).min(1).max(10),
  npcs: z.array(NpcSchema).min(1),
  players: z.array(PlayerSchema).min(1),
  world: z.string().min(1),
  source: z.nativeEnum(LootSource),
  location: z.string().min(1),
  accountId: z.string().min(1),
  characterId: z.string().min(1),
});

export class CreateLootDto extends createZodDto(CreateLootSchema) {}
