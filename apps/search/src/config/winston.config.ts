import * as winston from "winston";
import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import { RuntimeEnvironment } from "@lootlog/types";

const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN, COMMIT_SHA } = process.env;

const useConsole =
  ENV === RuntimeEnvironment.LOCAL || ENV === RuntimeEnvironment.DEV;

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${message}${metaStr}`;
  }),
);

const prodFormat = winston.format.json();

const transports = useConsole
  ? [new winston.transports.Console({ level: "debug" })]
  : [
      new AxiomTransport({
        dataset: AXIOM_DATASET as string,
        token: AXIOM_TOKEN as string,
      }),
    ];

export const logger = winston.createLogger({
  level: "info",
  format: useConsole ? consoleFormat : prodFormat,
  ...(useConsole
    ? {}
    : {
        defaultMeta: {
          service: `${ENV}-search-${HOSTNAME ?? "search"}`,
          commit: COMMIT_SHA?.slice(0, 7) ?? "unknown",
        },
      }),
  transports,
});
