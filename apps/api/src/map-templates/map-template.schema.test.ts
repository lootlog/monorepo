import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import {
  CreateMapTemplateSchema,
  MapTemplateResponseSchema,
} from "./map-template.schema.js";

const encoded = {
  id: "template-1",
  guildId: "guild-1",
  name: "Heros route",
  maps: [{ id: 10, name: "Ithan" }],
  createdAt: "2026-09-03T00:00:00.000Z",
};

describe("map template HTTP codec", () => {
  it("decodes and encodes the public response without changing its JSON", () => {
    const decoded = Schema.decodeUnknownSync(MapTemplateResponseSchema)(
      encoded,
    );

    expect(decoded.createdAt).toEqual(new Date(encoded.createdAt));
    expect(Schema.encodeSync(MapTemplateResponseSchema)(decoded)).toEqual(
      encoded,
    );
  });

  it("rejects invalid dates and unsafe nested map ids", () => {
    expect(() =>
      Schema.decodeUnknownSync(MapTemplateResponseSchema)({
        ...encoded,
        createdAt: "invalid",
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(MapTemplateResponseSchema)({
        ...encoded,
        maps: [{ id: Number.MAX_SAFE_INTEGER + 1, name: "Ithan" }],
      }),
    ).toThrow();
  });

  it("validates the nested create payload", () => {
    expect(
      Schema.decodeUnknownSync(CreateMapTemplateSchema)({
        name: encoded.name,
        maps: encoded.maps,
      }),
    ).toEqual({ name: encoded.name, maps: encoded.maps });
    expect(() =>
      Schema.decodeUnknownSync(CreateMapTemplateSchema)({
        name: encoded.name,
        maps: [{ id: 1.5, name: "Ithan" }],
      }),
    ).toThrow();
  });
});
