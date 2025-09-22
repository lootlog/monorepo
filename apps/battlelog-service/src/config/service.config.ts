import { registerAs } from '@nestjs/config';
import { RuntimeEnvironment } from 'src/types/runtime.types';

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export default registerAs('service', (): ServiceConfig => {
  const { ENV, PORT } = process.env;

  return {
    env: ENV,
    port: PORT || 4000,
  };
});
