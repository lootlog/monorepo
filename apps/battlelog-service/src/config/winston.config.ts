import * as winston from 'winston';
import { registerAs } from '@nestjs/config';
import type { WinstonModuleOptions } from 'nest-winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';
import { ConfigKey } from 'src/config/config-key.enum';
import { RuntimeEnvironment } from 'src/types/runtime.types';

export default registerAs(ConfigKey.WINSTON, (): WinstonModuleOptions => {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN } = process.env;
  const hasAxiomConfig = Boolean(AXIOM_DATASET && AXIOM_TOKEN);

  const transports =
    ENV === RuntimeEnvironment.LOCAL
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
    format: winston.format.json(),
    defaultMeta: { service: `${ENV}-api-service-${HOSTNAME}` },
    transports,
  };
});
