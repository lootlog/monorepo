import * as winston from 'winston';
import { registerAs } from '@nestjs/config';
import type { WinstonModuleOptions } from 'nest-winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';
import { ConfigKey } from 'src/config/config-key.enum';
import { RuntimeEnvironment } from '@lootlog/types';

export default registerAs(ConfigKey.WINSTON, (): WinstonModuleOptions => {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN, SERVICE_NAME } =
    process.env;

  const isLocal = ENV === RuntimeEnvironment.LOCAL;

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
    : [
        new AxiomTransport({
          dataset: AXIOM_DATASET,
          token: AXIOM_TOKEN,
        }),
      ];

  return {
    level: 'info',
    format: isLocal ? localFormat : prodFormat,
    ...(isLocal
      ? {}
      : {
          defaultMeta: {
            service: `${ENV}-${SERVICE_NAME}-${HOSTNAME ?? 'activity'}`,
          },
        }),
    transports,
  };
});
