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

export const MargonemAccountProofSchema = z.object({
  userId: z.string(),
  characterId: z.string(),
  clanId: z.number().optional(),
  token: z.string(),
  ts: z.number(),
  validatedString: z.string(),
  signatureBase64: z.string(),
});

export type MargonemAccountProofDto = z.infer<
  typeof MargonemAccountProofSchema
>;

const JoinGatewaySchema = z.object({
  data: SocketUserPlayerSchema.optional(),
  margonemAccountProof: MargonemAccountProofSchema.optional(),
});

export class JoinGatewayDto extends createZodDto(JoinGatewaySchema) {}
