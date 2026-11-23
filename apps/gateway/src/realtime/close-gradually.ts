import { Effect } from "effect";
import type { GatewaySocket } from "#src/realtime/session";

const CLOSE_BATCH_INTERVAL_MS = 100;

export const closeGradually = (
  sockets: ReadonlyArray<GatewaySocket>,
  spreadMs: number,
  close: (socket: GatewaySocket) => void,
) =>
  Effect.gen(function* () {
    const batchSize = Math.max(
      1,
      Math.ceil(
        sockets.length / Math.max(1, spreadMs / CLOSE_BATCH_INTERVAL_MS),
      ),
    );

    for (let index = 0; index < sockets.length; index += batchSize) {
      if (index > 0) yield* Effect.sleep(CLOSE_BATCH_INTERVAL_MS);

      for (const socket of sockets.slice(index, index + batchSize))
        close(socket);
    }
  });
