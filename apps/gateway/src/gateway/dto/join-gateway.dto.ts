import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const SocketUserPlayerLocationSchema = z.object({
  x: z.number(),
  y: z.number(),
  map: z.string(),
});

const SocketUserPlayerClanSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
});

const SocketUserPlayerSchema = z.object({
  world: z.string(),
  name: z.string(),
  characterId: z.string(),
  accountId: z.string(),
  icon: z.string(),
  lvl: z.string(),
  prof: z.string(),
  location: SocketUserPlayerLocationSchema,
  clan: SocketUserPlayerClanSchema.optional(),
});

const JoinGatewaySchema = z.object({
  data: SocketUserPlayerSchema.optional(),
});

export class JoinGatewayDto extends createZodDto(JoinGatewaySchema) {}
