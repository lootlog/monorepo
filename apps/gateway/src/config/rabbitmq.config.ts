import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export const DEFAULT_EXCHANGE_NAME = 'default';
export const DEFAULT_RPC_TIMEOUT = 5000;

export default registerAs(ConfigKey.RABBITMQ, (): RabbitMQConfig => {
  const { RABBITMQ_URI } = process.env;

  return {
    uri: RABBITMQ_URI,
    exchanges: [{ name: DEFAULT_EXCHANGE_NAME, type: 'topic' }],
    channels: {
      default: {
        prefetchCount: 1,
        default: true,
      },
    },
  };
});
