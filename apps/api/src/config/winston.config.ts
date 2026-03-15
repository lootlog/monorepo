import * as winston from "winston";
import { registerAs } from "@nestjs/config";
import type { WinstonModuleOptions } from "nest-winston";
import { WinstonTransport as AxiomTransport } from "@axiomhq/winston";
import { ConfigKey } from "src/config/config-key.enum";
import { RuntimeEnvironment } from "src/types/runtime.types";

export default registerAs(ConfigKey.WINSTON, (): WinstonModuleOptions => {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN, COMMIT_SHA } = process.env;

  const useConsole =
    ENV === RuntimeEnvironment.LOCAL || ENV === RuntimeEnvironment.DEV;

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : "";
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";
      return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
    }),
  );

  const prodFormat = winston.format.json();

  const transports = useConsole
    ? [new winston.transports.Console({ level: "debug" })]
    : [
        new AxiomTransport({
          dataset: AXIOM_DATASET,
          token: AXIOM_TOKEN,
        }),
      ];

  return {
    level: "info",
    format: useConsole ? consoleFormat : prodFormat,
    ...(useConsole
      ? {}
      : {
          defaultMeta: {
            service: `${ENV}-api-service-${HOSTNAME ?? "api"}`,
            commit: COMMIT_SHA?.slice(0, 7) ?? "unknown",
          },
        }),
    transports,
  };
});
