import type { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from './config-key.enum';

export const rabbitmqModuleConfig = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
};
