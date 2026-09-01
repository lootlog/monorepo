import type { z } from "zod";
import { RuntimeEnvironment } from "@lootlog/types";

const LOCAL_ACTIVITY_EVENT_SIGNATURE_SECRET =
  "local-development-activity-event-signature-secret";

export function createEnv<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}

export function resolveActivityEventSignatureSecret(
  environment: RuntimeEnvironment,
  configuredSecret: string | undefined,
): string {
  if (
    environment !== RuntimeEnvironment.STAGING &&
    environment !== RuntimeEnvironment.PROD
  ) {
    return LOCAL_ACTIVITY_EVENT_SIGNATURE_SECRET;
  }

  if (configuredSecret) {
    return configuredSecret;
  }

  throw new Error(
    `ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=${environment}`,
  );
}
