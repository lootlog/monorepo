import { expect, test } from "bun:test";

test("composes every handler group and forward-auth before serving routes", async () => {
  const source = await Bun.file(
    new URL("./http-routes.ts", import.meta.url),
  ).text();

  expect(source).toContain("HttpApiBuilder.layer(LootlogApi");
  expect(source).toContain("Layer.provide(LootlogApiHandlers)");
  expect(source).toContain("OrganizationAuthorizationLayers.pipe(");
  expect(source).toContain("RequestIdentityLayers,");
  expect(source).toContain("Layer.provide(HandlerInfrastructure)");
  expect(source).toContain("Layer.provide(ForwardAuthMiddlewareLive)");
  expect(source).toContain("HttpRouter.serve(LootlogApiRoutes)");
  expect(source).toContain('hostname: "0.0.0.0", port');
  expect(source).toContain("Effect.map(ApiRuntimeConfig");
});
