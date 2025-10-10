import { registerAs } from '@nestjs/config';
import { ConfigKey } from './config-key.enum';

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucketName: string;
}

export default registerAs(
  ConfigKey.R2,
  (): R2Config => ({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    endpoint: process.env.R2_ENDPOINT!,
    region: process.env.R2_REGION || 'auto',
    bucketName: process.env.R2_BUCKET_NAME!,
  }),
);