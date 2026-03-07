import * as winston from 'winston';
import { registerAs } from '@nestjs/config';
import type { WinstonModuleOptions } from 'nest-winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';
import { ConfigKey } from 'src/config/config-key.enum';
import { RuntimeEnvironment } from 'src/types/runtime.types';

export default registerAs(ConfigKey.WINSTON, (): WinstonModuleOptions => {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN } = process.env;

  const isLocal = ENV === RuntimeEnvironment.LOCAL;
  const hasAxiomConfig = Boolean(AXIOM_DATASET && AXIOM_TOKEN);

  const localFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`;
    }),
  );

  const prodFormat = winston.format.json();

  const transports = isLocal
    ? [new winston.transports.Console({ level: 'debug' })]
    : hasAxiomConfig
      ? [
          new AxiomTransport({
            dataset: AXIOM_DATASET,
            token: AXIOM_TOKEN,
          }),
        ]
      : [new winston.transports.Console({ level: 'info' })];

  return {
    level: 'info',
    format: isLocal ? localFormat : prodFormat,
    ...(isLocal
      ? {}
      : {
          defaultMeta: { service: `${ENV}-api-service-${HOSTNAME ?? 'api'}` },
        }),
    transports,
  };
});
