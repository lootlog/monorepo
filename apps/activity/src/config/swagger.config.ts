export interface SwaggerConfig {
  path: string;
  title: string;
  description: string;
  version: string;
}

export const swaggerConfig: SwaggerConfig = {
  path: "docs",
  title: "Activity Logger API",
  description: "The Activity Logger API documentation",
  version: "1.0",
};
