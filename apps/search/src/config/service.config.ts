import { env } from "#src/config/env";
import type { RuntimeEnvironment } from "@lootlog/types";

interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
  serviceName: string;
}

export const serviceConfig: ServiceConfig = {
  env: env.ENV,
  port: env.PORT,
  serviceName: env.SERVICE_NAME,
};
