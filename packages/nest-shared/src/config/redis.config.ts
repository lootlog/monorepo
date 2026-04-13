import { registerAs } from "@nestjs/config";

export const REDIS_CONFIG_KEY = "redis";

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  username: string;
}

export default registerAs(REDIS_CONFIG_KEY, (): RedisConfig => {
  const { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_USERNAME } =
    process.env;

  return {
    host: REDIS_HOST,
    port: Number.parseInt(REDIS_PORT ?? "6379", 10),
    password: REDIS_PASSWORD,
    username: REDIS_USERNAME,
  };
});
