import { Context, type Effect } from "effect";
import type { BingoEvaluatorService } from "./bingo-evaluator.js";
import type { BingoService } from "./bingo.service.js";

export class BingoData extends Context.Service<BingoData, BingoService>()(
  "@lootlog/api/bingo/BingoData",
) {}

export class BingoEvaluator extends Context.Service<
  BingoEvaluator,
  BingoEvaluatorService
>()("@lootlog/api/bingo/BingoEvaluator") {}

export class BingoOutboxes extends Context.Service<
  BingoOutboxes,
  {
    readonly runMilestones: Effect.Effect<never>;
    readonly runKills: Effect.Effect<never>;
    readonly signalKills: Effect.Effect<void>;
  }
>()("@lootlog/api/bingo/BingoOutboxes") {}
