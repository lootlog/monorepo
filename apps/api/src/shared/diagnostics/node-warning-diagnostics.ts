import { env } from "#src/config/env";

let registered = false;

export function registerNodeWarningDiagnostics() {
  if (registered || !env.NODE_WARNING_DIAGNOSTICS_ENABLED) {
    return;
  }

  registered = true;

  process.on("warning", (warning) => {
    if (warning.name !== "MaxListenersExceededWarning") {
      return;
    }

    console.warn(
      JSON.stringify({
        level: "warn",
        event: "node.warning",
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
        podName: process.env.HOSTNAME,
      }),
    );
  });
}
