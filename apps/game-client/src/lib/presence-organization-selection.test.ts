import { describe, expect, it } from "vitest";
import { resolvePresenceOrganizationIds } from "./presence-organization-selection";

describe("presence organization selection", () => {
  it("publishes nowhere when the current clan has no organization match", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [{ id: "organization-1" }],
        currentClanId: 20,
      }),
    ).toEqual([]);
  });

  it("uses the active character's preferred accessible organization as the clan-safe default", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [
          { id: "organization-1" },
          { id: "organization-2" },
        ],
        currentClanId: 20,
        preferredOrganizationId: "organization-2",
      }),
    ).toEqual(["organization-2"]);
  });

  it("keeps explicit selection additive but intersects current access", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [
          { id: "organization-1" },
          { id: "organization-2" },
        ],
        currentClanId: 20,
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
