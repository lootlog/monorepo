import { z } from "zod";

export const getBattleTimelinePayloadTurn = z
  .object({
    turn: z.coerce.number(),
  })
  .transform(({ turn }) => turn)
  .nullable()
  .catch(null).parse;
