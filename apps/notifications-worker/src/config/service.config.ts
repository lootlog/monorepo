import { registerAs } from "@nestjs/config";

export interface ServiceConfig {
  env: string;
  port: number;
}

export default registerAs(
  "service",
  (): ServiceConfig => ({
    env: process.env.ENV ?? "local",
    port: Number(process.env.PORT) || 4010,
  }),
);
