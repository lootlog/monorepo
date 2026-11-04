import { Schema, SchemaTransformation } from "effect";
import { CoercedFinite, withFallback } from "@/lib/lenient-schema";

export const getBattleTimelinePayloadTurn = Schema.decodeUnknownSync(
  withFallback(
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
