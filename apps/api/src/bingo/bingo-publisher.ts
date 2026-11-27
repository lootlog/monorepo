import type {
  BingoMilestoneNotificationEvent,
  BingoRealtimeUpdate,
} from "@lootlog/schema/bingo";
import type { Effect } from "effect";

export interface BingoPublisher {
  readonly publishRealtimeUpdate: (
    event: BingoRealtimeUpdate,
  ) => Effect.Effect<void>;
  readonly publishMilestoneNotification: (
    event: BingoMilestoneNotificationEvent,
  ) => Effect.Effect<void>;
}
