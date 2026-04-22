import { createWinstonConfig } from "@lootlog/nest-shared/config";
import { env } from "src/config/env";

export const winstonConfig = createWinstonConfig({
  serviceName: env.SERVICE_NAME,
});
