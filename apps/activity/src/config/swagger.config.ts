import { registerAs } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

export interface SwaggerConfig {
  path: string;
  title: string;
  description: string;
  version: string;
}

export default registerAs(ConfigKey.SWAGGER, (): SwaggerConfig => {
  const { APP_VERSION } = process.env;

  return {
    path: 'docs',
    title: 'Activity Logger API',
    description: 'The Activity Logger API documentation',
    version: APP_VERSION,
  };
});
