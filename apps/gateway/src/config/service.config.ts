import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { RuntimeEnvironment } from 'src/types/common.types';

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
  serviceName?: string;
}

export default registerAs(ConfigKey.SERVICE, (): ServiceConfig => {
  const { ENV, PORT, SERVICE_NAME } = process.env;

  return {
    env: ENV,
    port: parseInt(PORT, 10) || 4000,
    serviceName: SERVICE_NAME,
  };
});
