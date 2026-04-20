import type { RuntimeEnvironment } from "src/types/common.types";
import { env } from "src/config/env";

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
