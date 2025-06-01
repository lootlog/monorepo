import { Module } from '@nestjs/common';
import { HealthzModule } from './healthz/healthz.module';
import { APP_CONFIG } from 'src/config/app.config';
import { ConfigModule } from '@nestjs/config';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    HealthzModule,
    ConfigModule.forRoot(APP_CONFIG),
    ConfigModule,
    GatewayModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
