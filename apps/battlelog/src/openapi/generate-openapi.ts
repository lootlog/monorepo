const openApiPath = new URL("../../openapi.yaml", import.meta.url);
const openApi = await Bun.file(openApiPath).text();
const operationIds = openApi.match(/^\s+operationId:\s+.+$/gm) ?? [];

if (operationIds.length !== 26) {
  throw new Error(
    `Battlelog OpenAPI parity failed: expected 26 operations, found ${operationIds.length}`,
  );
}

await Bun.write(openApiPath, openApi);
