import { registerAs } from "@nestjs/config";
import { createWinstonConfig } from "@lootlog/nest-shared";
import { ConfigKey } from "src/config/config-key.enum";

export default registerAs(ConfigKey.WINSTON, () =>
  createWinstonConfig({ serviceName: "gateway" }),
);
