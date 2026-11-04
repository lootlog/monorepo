import { Schema, SchemaTransformation } from "effect";
import { requiredWithFallback } from "@lootlog/schema/stored-value";
import { CoercedFinite } from "@/lib/lenient-schema";

export const getBattleTimelinePayloadTurn = Schema.decodeUnknownSync(
  requiredWithFallback(
    Schema.NullOr(
      Schema.Struct({ turn: CoercedFinite }).pipe(
        Schema.decodeTo(
          Schema.Finite,
          SchemaTransformation.transform<number, { readonly turn: number }>({
            decode: ({ turn }) => turn,
            encode: (turn) => ({ turn }),
          }),
        ),
      ),
    ),
    null,
  ),
);
