import { env } from "src/config/env";

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucketName: string;
}

export const r2Config: R2Config = {
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  endpoint: env.R2_ENDPOINT,
  region: env.R2_REGION,
  bucketName: env.R2_BUCKET_NAME,
};
