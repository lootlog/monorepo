const IDENTITY_IMPORT =
  'import { ForwardAuthIdentity } from "./runtime/forward-auth-identity.js";\n';
const EFFECT_IMPORT = 'import * as Schema from "effect/Schema";\n';
const GENERATED_DECLARATION =
  "export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<BearerSecurityMiddleware>()(";
const FORWARD_AUTH_DECLARATION = `export class BearerSecurityMiddleware extends HttpApiMiddleware.Service<
  BearerSecurityMiddleware,
  { provides: ForwardAuthIdentity }
>()(`;

export const restoreForwardAuthMiddleware = (source: string): string => {
  const generatedCount = source.split(GENERATED_DECLARATION).length - 1;
  const restoredCount = source.split(FORWARD_AUTH_DECLARATION).length - 1;

  if (generatedCount + restoredCount !== 1) {
    throw new Error(
      `forward-auth middleware: expected one declaration, found ${generatedCount} generated and ${restoredCount} restored`,
    );
  }

  if (!source.includes(IDENTITY_IMPORT)) {
    if (!source.startsWith(EFFECT_IMPORT)) {
      throw new Error(
        "forward-auth middleware: Effect schema import was not found",
      );
    }
    source = source.replace(
      EFFECT_IMPORT,
      `${EFFECT_IMPORT}${IDENTITY_IMPORT}`,
    );
  }

  return source.replace(GENERATED_DECLARATION, FORWARD_AUTH_DECLARATION);
};
