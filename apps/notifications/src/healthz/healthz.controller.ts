import { Controller, Get } from "@nestjs/common";

@Controller("healthz")
export class HealthzController {
  @Get()
  healthCheck() {
    return { status: "ok" };
  }
}
