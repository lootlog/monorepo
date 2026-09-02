import * as winston from "winston";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { context, isSpanContextValid, trace } from "@opentelemetry/api";
import type { WinstonModuleOptions } from "nest-winston";

export interface WinstonConfigOptions {
  serviceName: string;
}

export const createWinstonConfig = ({
  serviceName,
}: WinstonConfigOptions): WinstonModuleOptions => {
  const { ENV, COMMIT_SHA } = process.env;

  const usePrettyConsole = ENV === RuntimeEnvironment.LOCAL;

  const traceContext = winston.format((info) => {
    const spanContext = trace.getSpan(context.active())?.spanContext();

    if (spanContext && isSpanContextValid(spanContext)) {
      info.trace_id = spanContext.traceId;
      info.span_id = spanContext.spanId;
    } else {
      info.trace_id = null;
      info.span_id = null;
    }

    return info;
  });

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    traceContext(),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : "";
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";
      return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
    }),
  );

  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    traceContext(),
    winston.format.json(),
  );

  return {
    level: usePrettyConsole ? "debug" : "info",
    format: usePrettyConsole ? consoleFormat : jsonFormat,
    defaultMeta: {
      service: serviceName,
      environment: ENV ?? "unknown",
      commit: COMMIT_SHA?.slice(0, 7) ?? "unknown",
    },
    transports: [
      new winston.transports.Console({
        level: usePrettyConsole ? "debug" : "info",
      }),
    ],
  };
};
