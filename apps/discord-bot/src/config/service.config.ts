import type { RuntimeEnvironment } from "@lootlog/types";
import { env } from "./env";

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
  serviceName: string;
}

export const serviceConfig: ServiceConfig = {
  env: env.ENV,
  port: env.PORT,
  serviceName: env.SERVICE_NAME,
};
