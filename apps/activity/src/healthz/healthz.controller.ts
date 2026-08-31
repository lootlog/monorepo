import { Controller, Get, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthIndicatorService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from "@nestjs/terminus";
import { PrismaService } from "#src/prisma.service";
import { apiServiceConfig } from "#src/config/api-service.config";

@ApiTags("health")
@Controller("healthz")
export class HealthzController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly healthIndicator: HealthIndicatorService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
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
      () => this.checkDatabase(),
      () =>
        this.http.pingCheck("api-service", `${apiServiceConfig.url}/healthz`),
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 400 * 1024 * 1024),
      () =>
        this.disk.checkStorage("storage", { path: "/", thresholdPercent: 0.9 }),
    ]);
  }

  private async checkDatabase() {
    const indicator = this.healthIndicator.check("database");
    try {
      await this.prisma.db.orm.public.MemberActivityStats.select("guildId")
        .limit(1)
        .all();
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : "Database unavailable",
      });
    }
  }
}
