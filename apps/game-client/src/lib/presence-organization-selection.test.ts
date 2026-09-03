import { describe, expect, it } from "vitest";
import { resolvePresenceOrganizationIds } from "./presence-organization-selection";

describe("presence organization selection", () => {
  it("uses the only accessible organization as the safe default", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [{ id: "organization-1" }],
      }),
    ).toEqual(["organization-1"]);
  });

  it("does not infer a clan default from a UI organization selection", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [
          { id: "organization-1" },
          { id: "organization-2" },
        ],
      }),
    ).toEqual([]);
  });

  it("does not publish an explicitly selected inaccessible organization", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [{ id: "organization-1" }],
        explicitlySelectedIds: ["removed-organization"],
      }),
    ).toEqual([]);
  });

  it("keeps explicit selection additive but intersects current access", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [
          { id: "organization-1" },
          { id: "organization-2" },
        ],
        explicitlySelectedIds: [
          "organization-2",
          "removed-organization",
          "organization-1",
          "organization-2",
        ],
      }),
    ).toEqual(["organization-2", "organization-1"]);
  });
});
