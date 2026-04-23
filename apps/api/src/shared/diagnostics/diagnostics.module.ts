import { Global, Module } from "@nestjs/common";
import { PerfDiagnosticsMiddleware } from "./perf-diagnostics.middleware";
import { PerfDiagnosticsService } from "./perf-diagnostics.service";

@Global()
@Module({
  providers: [PerfDiagnosticsMiddleware, PerfDiagnosticsService],
  exports: [PerfDiagnosticsMiddleware, PerfDiagnosticsService],
})
export class DiagnosticsModule {}
