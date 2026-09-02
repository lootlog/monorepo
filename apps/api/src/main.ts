import "reflect-metadata";
import { registerNodeWarningDiagnostics } from "#src/shared/diagnostics/node-warning-diagnostics";
import { ApiApplicationLive } from "./http-api/runtime/api-application.js";
import { runApiRuntime } from "./http-api/runtime/bun-runtime.js";

registerNodeWarningDiagnostics();
runApiRuntime(ApiApplicationLive);
