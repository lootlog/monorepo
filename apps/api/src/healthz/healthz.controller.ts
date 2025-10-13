import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthzService } from 'src/healthz/healthz.service';
import { CircuitBreakerService } from 'src/lib/circuit-breaker/circuit-breaker.service';

@ApiTags('health')
@Controller('healthz')
export class HealthzController {
  constructor(
    private readonly healthzService: HealthzService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health status of the API',
  })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  healthCheck() {
    return this.healthzService.healthCheck();
  }

  @Get('circuit-breakers')
  @ApiOperation({
    summary: 'Circuit breaker stats',
    description: 'Get stats for all circuit breakers',
  })
  @ApiResponse({ status: 200, description: 'Circuit breaker statistics' })
  getCircuitBreakerStats() {
    return this.circuitBreakerService.getAllBreakerStats();
  }
}
