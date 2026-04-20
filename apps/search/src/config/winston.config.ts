import { createWinstonConfig } from "@lootlog/nest-shared";
import { serviceConfig } from "src/config/service.config";

export const winstonConfig = createWinstonConfig({
  serviceName: serviceConfig.serviceName,
});
