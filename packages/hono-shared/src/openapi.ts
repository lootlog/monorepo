import { swaggerUI } from "@hono/swagger-ui";

export interface RegisterOpenApiDocsOptions {
  docsPath?: string;
  openApiPath?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
}

export function registerOpenApiDocs(
  app: {
    doc: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
  },
  {
    docsPath = "/docs",
    openApiPath = "/doc",
    info,
  }: RegisterOpenApiDocsOptions,
) {
  app.doc(openApiPath, {
    openapi: "3.1.0",
    info,
  });
  app.get(docsPath, swaggerUI({ url: openApiPath }));
}
