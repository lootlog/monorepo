import { z } from "zod";

export const SocketUserPlayerLocationSchema = z.object({
  x: z.number(),
  y: z.number(),
  map: z.string(),
});

export const SocketUserPlayerSchema = z.object({
  world: z.string(),
  name: z.string(),
  characterId: z.string(),
  accountId: z.string(),
  icon: z.string(),
  lvl: z.string(),
  prof: z.string(),
  location: SocketUserPlayerLocationSchema,
  clanName: z.string().optional(),
  clanId: z.number().optional(),
});

export const JoinGatewaySchema = z.object({
  data: SocketUserPlayerSchema,
});

export type JoinGatewayDto = z.infer<typeof JoinGatewaySchema>;
