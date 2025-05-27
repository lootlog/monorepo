import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { registerAs } from '@nestjs/config';

export const DEFAULT_EXCHANGE_NAME = 'default';

export default registerAs('rabbitmq', (): RabbitMQConfig => {
  const { RABBITMQ_URI } = process.env;

  console.log('RABBITMQ_URI:', RABBITMQ_URI);

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
