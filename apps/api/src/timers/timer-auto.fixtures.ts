import { Effect, Option } from "effect";
import type { AutoTimerGuildWritePorts } from "./timer-auto-guild-write.js";

export const singleFlightLocks = (
  onRelease: () => void = () => undefined,
): AutoTimerGuildWritePorts["locks"] => ({
  singleFlight: (_options, read, fill) =>
    read.pipe(
      Effect.flatMap(
        Option.match({ onSome: Effect.succeed, onNone: () => fill }),
      ),
      Effect.ensuring(Effect.sync(onRelease)),
    ),
});
