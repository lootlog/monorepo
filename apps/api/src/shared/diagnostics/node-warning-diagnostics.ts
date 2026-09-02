import { apiConfig } from "#src/config/api.config";

let registered = false;

export function registerNodeWarningDiagnostics() {
  if (registered || !apiConfig.nodeWarningDiagnosticsEnabled) {
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
        podName: apiConfig.hostName,
      }),
    );
  });
}
