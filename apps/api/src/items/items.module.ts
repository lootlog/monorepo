import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
