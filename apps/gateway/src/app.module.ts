import { Module } from '@nestjs/common';
import { HealthzModule } from './healthz/healthz.module';
import { APP_CONFIG } from 'src/config/app.config';
import { ConfigModule } from '@nestjs/config';
import { GatewayModule } from './gateway/gateway.module';
import { AuthzModule } from 'src/authz/authz.module';

@Module({
  imports: [
    HealthzModule,
    ConfigModule.forRoot(APP_CONFIG),
    ConfigModule,
    GatewayModule,
    AuthzModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
