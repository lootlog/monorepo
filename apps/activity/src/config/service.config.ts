import { RuntimeEnvironment } from '@lootlog/types';
import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export default registerAs(ConfigKey.SERVICE, (): ServiceConfig => {
  const { ENV, PORT } = process.env;

  return {
    env: ENV,
    port: PORT ? parseInt(PORT, 10) : 4000,
  };
});
