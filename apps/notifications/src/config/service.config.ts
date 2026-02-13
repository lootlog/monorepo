import { registerAs } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import type { RuntimeEnvironment } from "src/types/runtime.types";

export interface ServiceConfig {
  env: RuntimeEnvironment;
  port: number;
}

export default registerAs(ConfigKey.SERVICE, (): ServiceConfig => {
  const { ENV, PORT } = process.env;

  return {
    env: (ENV as RuntimeEnvironment) ?? ("local" as RuntimeEnvironment),
    port: Number.parseInt(PORT ?? "4028", 10),
  };
});
