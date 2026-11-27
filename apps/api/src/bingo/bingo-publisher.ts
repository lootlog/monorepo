import type { BingoRealtimeUpdate } from "@lootlog/schema/bingo";
import type { Effect } from "effect";

export interface BingoPublisher {
  readonly publishRealtimeUpdate: (
    event: BingoRealtimeUpdate,
  ) => Effect.Effect<void>;
  readonly signalMilestones: Effect.Effect<void>;
}
