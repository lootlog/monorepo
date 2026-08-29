import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthzService } from "./healthz.service.js";

@ApiTags("health")
@Controller("healthz")
export class HealthzController {
  constructor(private readonly healthzService: HealthzService) {}

  @Get()
  @ApiOperation({
    summary: "Health check",
    description: "Check the health status of the search service",
  })
  @ApiResponse({ status: 200, description: "Search service is healthy" })
  healthCheck() {
    return this.healthzService.healthCheck();
  }
}
