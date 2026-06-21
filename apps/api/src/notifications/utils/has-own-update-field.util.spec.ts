import { hasOwnUpdateField } from "./has-own-update-field.util";

describe("hasOwnUpdateField", () => {
  it("detects nullable fields explicitly present in partial update data", () => {
    expect(hasOwnUpdateField({ displayName: null }, "displayName")).toBe(true);
  });

  it("returns false when the partial update field is omitted", () => {
    const updateData: { displayName?: string | null } = {};

    expect(hasOwnUpdateField(updateData, "displayName")).toBe(false);
  });

  it("ignores fields inherited from the prototype chain", () => {
    const updateData = Object.create({
      displayName: "inherited",
    }) as { displayName?: string };

    expect(hasOwnUpdateField(updateData, "displayName")).toBe(false);
  });
});
