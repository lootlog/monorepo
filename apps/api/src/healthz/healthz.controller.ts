import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthzService } from "#src/healthz/healthz.service";

@ApiTags("health")
@Controller("healthz")
export class HealthzController {
  constructor(private readonly healthzService: HealthzService) {}

  @Get()
  @ApiOperation({
    summary: "Health check",
    description: "Check the health status of the API",
  })
  @ApiResponse({ status: 200, description: "API is healthy" })
  healthCheck() {
    return this.healthzService.healthCheck();
  }
}
