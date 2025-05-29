import { registerAs } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/common.types';
import { ConfigKey } from './config-key.enum';

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export default registerAs(ConfigKey.SERVICE, (): ServiceConfig => {
  const { ENV, PORT } = process.env;

  return {
    env: ENV,
    port: parseInt(PORT, 10) || 4000,
  };
});
