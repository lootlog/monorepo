import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import { RuntimeEnvironment } from "@lootlog/types";
import * as winston from "winston";
import { APP_CONFIG } from "./env.js";

const useConsole =
  APP_CONFIG.env === RuntimeEnvironment.LOCAL ||
  APP_CONFIG.env === RuntimeEnvironment.DEV;

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

    return `${timestamp} ${level} ${message}${metaString}`;
  }),
);

const transports = useConsole
  ? [new winston.transports.Console({ level: "debug" })]
  : [
      new AxiomTransport({
        dataset: APP_CONFIG.telemetry.axiomDataset as string,
        token: APP_CONFIG.telemetry.axiomToken as string,
      }),
    ];

export const logger = winston.createLogger({
  level: "info",
  format: useConsole ? consoleFormat : winston.format.json(),
  ...(useConsole
    ? {}
    : {
        defaultMeta: {
          service: `${APP_CONFIG.env}-${APP_CONFIG.serviceName}-${APP_CONFIG.telemetry.hostname ?? APP_CONFIG.serviceName}`,
          commit: APP_CONFIG.telemetry.commitSha?.slice(0, 7) ?? "unknown",
        },
      }),
  transports,
});
