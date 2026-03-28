import { registerAs } from "@nestjs/config";

export interface BattlelogConfig {
  serviceUrl: string;
}

export default registerAs("battlelog", (): BattlelogConfig => {
  const { BATTLELOG_SERVICE_URL } = process.env;

  return {
    serviceUrl: BATTLELOG_SERVICE_URL || "http://battlelog-service:4000",
  };
});
