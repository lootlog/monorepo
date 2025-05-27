import { Controller, Get } from '@nestjs/common';
import { HealthzService } from 'src/healthz/healthz.service';

@Controller('healthz')
export class HealthzController {
  constructor(private readonly healthzService: HealthzService) {}

  @Get()
  healthCheck() {
    return this.healthzService.healthCheck();
  }
}
