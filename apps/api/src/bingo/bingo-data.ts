import { Context } from "effect";
import type { BingoEvaluatorService } from "./bingo-evaluator.js";
import type { BingoService } from "./bingo.service.js";

export class BingoData extends Context.Service<BingoData, BingoService>()(
  "@lootlog/api/bingo/BingoData",
) {}

export class BingoEvaluator extends Context.Service<
  BingoEvaluator,
  BingoEvaluatorService
>()("@lootlog/api/bingo/BingoEvaluator") {}
