import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthzService } from "./healthz.service.js";

@ApiTags("health")
@Controller("healthz")
export class HealthzController {
  constructor(
    @Inject(HealthzService)
    private readonly healthzService: HealthzService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiResponse({ status: 200, description: "Auth service is healthy" })
  healthCheck() {
    return this.healthzService.healthCheck();
  }
}
