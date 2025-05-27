import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthzService {
  healthCheck(): string {
    return 'OK';
  }
}
