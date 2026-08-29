import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from "@nestjs/terminus";
import { PrismaService } from "#src/shared/db/prisma.service";
import { apiServiceConfig } from "#src/config/api-service.config";

@ApiTags("health")
@Controller("healthz")
export class HealthzController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Health check",
    description:
      "Check the health status of the Activity service (database, API service, memory, disk)",
  })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
  })
  @ApiResponse({
    status: 503,
    description: "Service is unhealthy",
  })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck("database", this.prisma),
      () =>
        this.http.pingCheck("api-service", `${apiServiceConfig.url}/healthz`),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 400 * 1024 * 1024),
      () =>
        this.disk.checkStorage("storage", { path: "/", thresholdPercent: 0.9 }),
    ]);
  }
}
