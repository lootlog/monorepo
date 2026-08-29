import "reflect-metadata";
import { Injectable } from "@nestjs/common";
import { describe, expect, it } from "vitest";

class MetadataDependency {}

@Injectable()
class MetadataConsumer {
  constructor(readonly dependency: MetadataDependency) {}
}

describe("Nest decorator metadata", () => {
  it("preserves constructor parameter types through the test transformer", () => {
    expect(Reflect.getMetadata("design:paramtypes", MetadataConsumer)).toEqual([
      MetadataDependency,
    ]);
  });
});
