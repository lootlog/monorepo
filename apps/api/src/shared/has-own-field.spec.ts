import { hasOwnField } from "./has-own-field.js";

describe("hasOwnField", () => {
  it("detects nullable fields explicitly present in partial update data", () => {
    expect(hasOwnField({ displayName: null }, "displayName")).toBe(true);
  });

  it("returns false when the partial update field is omitted", () => {
    const updateData: { displayName?: string | null } = {};

    expect(hasOwnField(updateData, "displayName")).toBe(false);
  });

  it("ignores fields inherited from the prototype chain", () => {
    const updateData = Object.create({
      displayName: "inherited",
    }) as { displayName?: string };

    expect(hasOwnField(updateData, "displayName")).toBe(false);
  });
});
