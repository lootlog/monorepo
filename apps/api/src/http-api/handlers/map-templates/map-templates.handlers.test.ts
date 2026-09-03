import { describe, expect, it } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import {
  MapTemplateResponseDto,
  type CreateMapTemplateDto,
} from "../../contracts/map-templates/schemas.js";
import {
  createMapTemplate,
  MapTemplateNotFound,
  MapTemplatesAccessDenied,
  MapTemplatesAuthorization,
  MapTemplatesData,
  updateMapTemplate,
} from "./map-templates.handlers.js";

const payload: CreateMapTemplateDto = {
  name: "Heros route",
  maps: [{ id: 10, name: "Ithan" }],
};

const storedTemplate = {
  id: "template-1",
  guildId: "guild-a",
  name: payload.name,
  maps: payload.maps,
  createdAt: new Date("2026-09-02T00:00:00.000Z"),
};

const makeData = (overrides?: Partial<MapTemplatesData["Service"]>) =>
  MapTemplatesData.of({
    findMany: () => Effect.succeed([]),
    create: () => Effect.succeed(storedTemplate),
    update: () => Effect.succeed(storedTemplate),
    delete: () => Effect.succeed(true),
    ...overrides,
  });

const makeAuthorization = (
  requireCapability: MapTemplatesAuthorization["Service"]["requireCapability"],
) => MapTemplatesAuthorization.of({ requireCapability });

const provideTestServices = (
  authorization: MapTemplatesAuthorization["Service"],
  data: MapTemplatesData["Service"],
) =>
  Layer.merge(
    Layer.succeed(MapTemplatesAuthorization, authorization),
    Layer.succeed(MapTemplatesData, data),
  );

describe("Map Templates HttpApi handlers", () => {
  it("creates a template with the generated success contract and manage capability", async () => {
    const authorizationCalls: Array<{
      guildId: string;
      capability: string;
    }> = [];
    const createCalls: Array<{
      guildId: string;
      payload: CreateMapTemplateDto;
    }> = [];
    const layer = provideTestServices(
      makeAuthorization((options) => {
        authorizationCalls.push(options);
        return Effect.succeed({ guildId: options.guildId });
      }),
      makeData({
        create: (guildId, receivedPayload) => {
          createCalls.push({ guildId, payload: receivedPayload });
          return Effect.succeed(storedTemplate);
        },
      }),
    );

    const response = await Effect.runPromise(
      createMapTemplate("guild-a", payload).pipe(Effect.provide(layer)),
    );

    expect(authorizationCalls).toEqual([
      { guildId: "guild-a", capability: Permission.LOOTLOG_MANAGE },
    ]);
    expect(createCalls).toEqual([{ guildId: "guild-a", payload }]);
    expect(response).toEqual(storedTemplate);
    expect(Schema.is(MapTemplateResponseDto)(response)).toBe(true);
    expect(
      await Effect.runPromise(
        Schema.encodeEffect(MapTemplateResponseDto)(response),
      ),
    ).toEqual({
      ...storedTemplate,
      createdAt: "2026-09-02T00:00:00.000Z",
    });
  });

  it("fails closed before data access when the caller is forbidden", async () => {
    const denied = new MapTemplatesAccessDenied({
      status: 403,
      code: "LOOTLOG_MANAGE_REQUIRED",
    });
    let createCalled = false;
    const layer = provideTestServices(
      makeAuthorization(() => Effect.fail(denied)),
      makeData({
        create: () => {
          createCalled = true;
          return Effect.succeed(storedTemplate);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        createMapTemplate("guild-a", payload).pipe(Effect.provide(layer)),
      ),
    );

    expect(error).toBe(denied);
    if (!(error instanceof MapTemplatesAccessDenied)) {
      throw new Error("Expected MapTemplatesAccessDenied");
    }
    expect(error.status).toBe(403);
    expect(createCalled).toBe(false);
  });

  it("returns not-found without crossing the requested Organization boundary", async () => {
    const updateCalls: Array<{ guildId: string; templateId: string }> = [];
    const layer = provideTestServices(
      makeAuthorization(({ guildId }) => Effect.succeed({ guildId })),
      makeData({
        update: (guildId, templateId) => {
          updateCalls.push({ guildId, templateId });
          // The repository returns null when the id belongs to another guild.
          return Effect.succeed(null);
        },
      }),
    );

    const error = await Effect.runPromise(
      Effect.flip(
        updateMapTemplate("guild-a", "template-in-guild-b", payload).pipe(
          Effect.provide(layer),
        ),
      ),
    );

    expect(updateCalls).toEqual([
      { guildId: "guild-a", templateId: "template-in-guild-b" },
    ]);
    expect(error).toBeInstanceOf(MapTemplateNotFound);
    expect(error).toMatchObject({
      status: 404,
      code: "MAP_TEMPLATE_NOT_FOUND",
    });
  });
});
