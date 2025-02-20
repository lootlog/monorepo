import * as winston from 'winston';
import { registerAs } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';
import { ConfigKey } from 'src/config/config-key.enum';
import { RuntimeEnvironment } from 'src/types/common.types';

export default registerAs(ConfigKey.WINSTON, (): WinstonModuleOptions => {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN } = process.env;

  const transports =
    ENV === RuntimeEnvironment.LOCAL
      ? [new winston.transports.Console({ level: 'debug' })]
      : [
          new AxiomTransport({
            dataset: AXIOM_DATASET,
            token: AXIOM_TOKEN,
          }),
        ];

  return {
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: `${ENV}-${HOSTNAME ?? 'hostname'}` },
    transports,
  };
});
