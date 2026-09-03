import { runLogEffect } from "@lootlog/instrumentation";
import type { ApiConfiguration } from "#src/config/api.config";
import { Effect } from "effect";

let registered = false;

export function registerNodeWarningDiagnostics(
  config: Pick<ApiConfiguration, "hostName" | "nodeWarningDiagnosticsEnabled">,
) {
  if (registered || !config.nodeWarningDiagnosticsEnabled) {
    return;
  }

  registered = true;

  process.on("warning", (warning) => {
    if (warning.name !== "MaxListenersExceededWarning") {
      return;
    }

    runLogEffect(
      Effect.logWarning("Node MaxListeners warning").pipe(
        Effect.annotateLogs({
          event: "node.warning",
          name: warning.name,
          message: warning.message,
          stack: warning.stack,
          podName: config.hostName,
        }),
      ),
    );
  });
}
