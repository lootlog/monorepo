import { expect, test } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { membership } from "../../test/realtime-fixtures.js";
import { sessionAccessPolicy } from "./session-access.js";

test.each([
  [undefined, []],
  [
    true,
    [
      Capability.LOOTLOG_HERO_SIGHTINGS_READ,
      Capability.LOOTLOG_HERO_SIGHTINGS_WRITE,
    ],
  ],
])(
  "a session declaring hero sighting capabilities %p receives %p",
  (heroSightingCapabilities, expected) => {
    const [organization] = sessionAccessPolicy({
      discordId: "member",
      heroSightingCapabilities,
      guilds: [
        membership("organization-1", [
          Capability.LOOTLOG_TIMERS_READ,
          Capability.LOOTLOG_HERO_SIGHTINGS_READ,
          Capability.LOOTLOG_HERO_SIGHTINGS_WRITE,
        ]),
      ],
    }).organizations;

    expect(
      organization?.permissions.filter((permission) =>
        permission.startsWith("LOOTLOG_HERO_SIGHTINGS_"),
      ),
    ).toEqual(expected);
    expect(organization?.permissions).toContain(Capability.LOOTLOG_TIMERS_READ);
  },
);
