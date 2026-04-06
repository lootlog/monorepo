import { env } from "src/config/env";

export interface BattlelogConfig {
  serviceUrl: string;
}

export const battlelogConfig: BattlelogConfig = {
  serviceUrl: env.BATTLELOG_SERVICE_URL,
};
