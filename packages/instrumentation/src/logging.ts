import { AsyncLocalStorage } from "node:async_hooks";
import {
  Fiber,
  Formatter,
  Inspectable,
  Logger,
  Schema,
  type Tracer,
} from "effect";

const isLogContext = Schema.is(Schema.Struct({ context: Schema.String }));
const isLogMessage = Schema.is(Schema.Struct({ message: Schema.String }));

// Promise-based adapters run outside an Effect fiber, but belong to its span.
export const logSpanContext = new AsyncLocalStorage<
  Tracer.AnySpan | undefined
>();

export const currentLogSpan = () =>
  Fiber.getCurrent()?.currentSpan ?? logSpanContext.getStore();

export const makeJsonLogger = (config: {
  readonly serviceName: string;
  readonly environment: string;
  readonly commitSha: string | undefined;
}) =>
  Logger.withConsoleLog(
    Logger.make((options) => {
      const entry = Logger.formatStructured.log(options);
      const parts: ReadonlyArray<unknown> = (
        Array.isArray(entry.message) ? entry.message : [entry.message]
      ).filter((part) => part !== undefined);
      const context = parts.find(isLogContext);
      const span = options.fiber.currentSpan;
      return Formatter.formatJson({
        ...entry,
        message: parts
          .map((part) => {
            if (isLogMessage(part)) return part.message;
            return Inspectable.toStringUnknown(part, 0);
          })
          .join(" "),
        details: Formatter.format(entry.message),
        level: options.logLevel.toLowerCase(),
        service: config.serviceName,
        environment: config.environment,
        commit: config.commitSha,
        context: context ? context.context : entry.annotations.context,
        trace_id: span?.traceId,
        span_id: span?.spanId,
      });
    }),
  );
