import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import { RuntimeEnvironment } from "@lootlog/types";
import * as winston from "winston";
import { APP_CONFIG } from "./app.config.js";

const useConsole =
  APP_CONFIG.env === RuntimeEnvironment.LOCAL ||
  APP_CONFIG.env === RuntimeEnvironment.DEV;

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const metadataString =
      Object.keys(metadata).length === 0 ? "" : ` ${JSON.stringify(metadata)}`;

    return `${timestamp} ${level} ${message}${metadataString}`;
  }),
);

const productionTransports =
  APP_CONFIG.axiom.dataset && APP_CONFIG.axiom.token
    ? [
        new AxiomTransport({
          dataset: APP_CONFIG.axiom.dataset,
          token: APP_CONFIG.axiom.token,
        }),
      ]
    : [new winston.transports.Console({ level: "info" })];

export const logger = winston.createLogger({
  level: "info",
  format: useConsole ? consoleFormat : winston.format.json(),
  ...(useConsole
    ? {}
    : {
        defaultMeta: {
          service: `${APP_CONFIG.env}-${APP_CONFIG.serviceName}-${process.env.HOSTNAME ?? APP_CONFIG.serviceName}`,
          commit: APP_CONFIG.commitSha?.slice(0, 7) ?? "unknown",
        },
      }),
  transports: useConsole
    ? [new winston.transports.Console({ level: "debug" })]
    : productionTransports,
});
