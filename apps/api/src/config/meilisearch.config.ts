import { registerAs } from '@nestjs/config';
import { Config } from 'meilisearch';
import { ConfigKey } from 'src/config/config-key.enum';

export default registerAs(ConfigKey.MEILISEARCH, (): Config => {
  const { MEILISEARCH_MASTER_KEY, MEILISEARCH_HOST } = process.env;

  return {
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_MASTER_KEY,
  };
});
