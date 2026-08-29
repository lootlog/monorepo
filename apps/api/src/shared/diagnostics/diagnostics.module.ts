import { Global, Module } from "@nestjs/common";
import { PerfDiagnosticsMiddleware } from "./perf-diagnostics.middleware.js";
import { PerfDiagnosticsService } from "./perf-diagnostics.service.js";

@Global()
@Module({
  providers: [PerfDiagnosticsMiddleware, PerfDiagnosticsService],
  exports: [PerfDiagnosticsMiddleware, PerfDiagnosticsService],
})
export class DiagnosticsModule {}
