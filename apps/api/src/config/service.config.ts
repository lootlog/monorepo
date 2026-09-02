import { env } from "#src/config/env";
import type { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";

interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export const serviceConfig: ServiceConfig = {
  env: env.ENV,
  port: env.PORT,
};
