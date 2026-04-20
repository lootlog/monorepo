import { Controller, Get, Inject } from "@nestjs/common";
import { HealthzService } from "./healthz.service";

@Controller("healthz")
export class HealthzController {
  constructor(
    @Inject(HealthzService)
    private readonly healthzService: HealthzService,
  ) {}

  @Get()
  healthCheck() {
    return this.healthzService.healthCheck();
  }
}
