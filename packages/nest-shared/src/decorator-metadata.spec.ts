import "reflect-metadata";
import { Capability } from "@lootlog/domain/access-policy";
import { Injectable } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  REQUIRED_CAPABILITIES_KEY,
  RequiresCapabilities,
} from "./decorators/requires-capabilities.decorator.js";

class MetadataDependency {}

@Injectable()
class MetadataConsumer {
  constructor(readonly dependency: MetadataDependency) {}

  @RequiresCapabilities(Capability.LOOTLOG_ACCESS, Capability.ADMIN)
  protectedRoute() {}
}

describe("Nest decorator metadata", () => {
  it("preserves constructor parameter types through the test transformer", () => {
    expect(Reflect.getMetadata("design:paramtypes", MetadataConsumer)).toEqual([
      MetadataDependency,
    ]);
  });

  it("stores alternative required capabilities under the canonical key", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITIES_KEY,
        MetadataConsumer.prototype.protectedRoute,
      ),
    ).toEqual([Capability.LOOTLOG_ACCESS, Capability.ADMIN]);
  });
});
