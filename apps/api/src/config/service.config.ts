import { env } from "src/config/env";
import type { RuntimeEnvironment } from "src/types/runtime.types";

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export const serviceConfig: ServiceConfig = {
  env: env.ENV,
  port: env.PORT,
};
