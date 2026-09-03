import { describe, expect, it } from "vitest";
import {
  getPresenceClanKey,
  resolvePresenceOrganizationIds,
} from "./presence-organization-selection";

describe("presence organization selection", () => {
  it("publishes nowhere when the current clan has no organization match", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [{ id: "organization-1" }],
        currentClanKey: getPresenceClanKey("alpha", 20),
        defaultOrganizationIdByClanKey: {
          [getPresenceClanKey("alpha", 10)]: "organization-1",
        },
      }),
    ).toEqual([]);
  });

  it("uses the accessible organization mapped to the current clan as the safe default", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [
          { id: "organization-1" },
          { id: "organization-2" },
        ],
        currentClanKey: getPresenceClanKey("beta", 20),
        defaultOrganizationIdByClanKey: {
          [getPresenceClanKey("alpha", 20)]: "organization-1",
          [getPresenceClanKey("beta", 20)]: "organization-2",
        },
      }),
    ).toEqual(["organization-2"]);
  });

  it("does not use an inaccessible organization mapped to the current clan", () => {
    expect(
      resolvePresenceOrganizationIds({
        accessibleOrganizations: [{ id: "organization-1" }],
        currentClanKey: getPresenceClanKey("alpha", 20),
        defaultOrganizationIdByClanKey: {
          [getPresenceClanKey("alpha", 20)]: "removed-organization",
        },
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
        currentClanKey: getPresenceClanKey("alpha", 20),
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
