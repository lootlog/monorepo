import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  username: string;
}

export default registerAs(ConfigKey.REDIS, (): RedisConfig => {
  const { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } =
    process.env;

  return {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT, 10),
    password: REDIS_PASSWORD,
    username: REDIS_USERNAME,
  };
});
