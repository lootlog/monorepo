import type { Redacted } from "effect";

export interface R2Config {
  readonly accessKeyId: Redacted.Redacted<string>;
  readonly secretAccessKey: Redacted.Redacted<string>;
  readonly endpoint: string;
  readonly region: string;
  readonly bucketName: string;
}
