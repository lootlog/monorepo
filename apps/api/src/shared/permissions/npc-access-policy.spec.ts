import {
  evaluateNpcAccess,
  type NpcAccessContext,
  type NpcAccessRole,
  type NpcResource,
  type NpcVisibilityPermissions,
} from "@lootlog/api-helpers/permissions";

const TIMER_VISIBILITY_PERMISSIONS: NpcVisibilityPermissions = {
  base: "LOOTLOG_TIMERS_READ",
  heroes: "LOOTLOG_TIMERS_HEROES_READ",
  titans: "LOOTLOG_TIMERS_TITANS_READ",
};

const createRole = (overrides: Partial<NpcAccessRole> = {}): NpcAccessRole => ({
  permissions: ["LOOTLOG_TIMERS_READ"],
  ...overrides,
});

const createContext = (
  overrides: Partial<NpcAccessContext> = {},
): NpcAccessContext => ({
  organizationId: "organization-1",
  isOwner: false,
  roles: [createRole()],
  ...overrides,
});

const createResource = (overrides: Partial<NpcResource> = {}): NpcResource => ({
  organizationId: "organization-1",
  world: "Aether",
  npc: {
    id: 100,
    type: "ELITE2",
    group: "elite",
    level: 150,
  },
  ...overrides,
});

const evaluate = (options?: {
  context?: NpcAccessContext;
  resource?: NpcResource;
  actionPermission?: string;
}) =>
  evaluateNpcAccess({
    context: options?.context ?? createContext(),
    resource: options?.resource ?? createResource(),
    visibilityPermissions: TIMER_VISIBILITY_PERMISSIONS,
    actionPermission: options?.actionPermission,
  });

describe("evaluateNpcAccess", () => {
  it("allows an owner inside their organization without mapped roles", () => {
    expect(
      evaluate({
        context: createContext({ isOwner: true, roles: [] }),
        actionPermission: "LOOTLOG_TIMERS_DELETE",
      }),
    ).toEqual({ visible: true, allowed: true });
  });

  it("does not let owner authority cross the organization boundary", () => {
    expect(
      evaluate({
        context: createContext({ isOwner: true, roles: [] }),
        resource: createResource({ organizationId: "organization-2" }),
      }),
    ).toEqual({ visible: false, allowed: false });
  });

  it.each([
    {
      name: "missing base permission",
      role: createRole({ permissions: [] }),
    },
    {
      name: "world outside the role scope",
      role: createRole({ worlds: ["Fobos"] }),
    },
    {
      name: "level below the inclusive range",
      role: createRole({ npc: { levelRange: { from: 151, to: 200 } } }),
    },
    {
      name: "NPC excluded by id",
      role: createRole({ npc: { excludeIds: [100] } }),
    },
    {
      name: "NPC outside the included types",
      role: createRole({ npc: { includeTypes: ["TITAN"] } }),
    },
    {
      name: "NPC outside the included groups",
      role: createRole({ npc: { includeGroups: ["hero"] } }),
    },
  ])("denies visibility for $name", ({ role }) => {
    expect(evaluate({ context: createContext({ roles: [role] }) })).toEqual({
      visible: false,
      allowed: false,
    });
  });

  it("matches inclusive level bounds, world and NPC selectors", () => {
    const role = createRole({
      worlds: ["Aether"],
      npc: {
        includeIds: [100],
        includeTypes: ["ELITE2"],
        includeGroups: ["elite"],
        levelRange: { from: 150, to: 150 },
      },
    });

    expect(evaluate({ context: createContext({ roles: [role] }) })).toEqual({
      visible: true,
      allowed: true,
    });
  });

  it.each(["HERO", "EVENT_HERO"])(
    "requires the hero selector permission for %s",
    (type) => {
      const resource = createResource({
        npc: { ...createResource().npc, type },
      });

      expect(evaluate({ resource })).toEqual({
        visible: false,
        allowed: false,
      });
      expect(
        evaluate({
          context: createContext({
            roles: [
              createRole({
                permissions: [
                  "LOOTLOG_TIMERS_READ",
                  "LOOTLOG_TIMERS_HEROES_READ",
                ],
              }),
            ],
          }),
          resource,
        }),
      ).toEqual({ visible: true, allowed: true });
    },
  );

  it("requires the titan selector permission for titans", () => {
    const resource = createResource({
      npc: { ...createResource().npc, type: "TITAN" },
    });

    expect(evaluate({ resource })).toEqual({
      visible: false,
      allowed: false,
    });
  });

  it("does not combine permissions and selectors from separate roles", () => {
    const context = createContext({
      roles: [
        createRole({
          permissions: ["LOOTLOG_TIMERS_READ", "LOOTLOG_TIMERS_TITANS_READ"],
          npc: { levelRange: { from: 1, to: 149 } },
        }),
        createRole({
          permissions: [],
          npc: { levelRange: { from: 150, to: 200 } },
        }),
      ],
    });
    const resource = createResource({
      npc: { ...createResource().npc, type: "TITAN" },
    });

    expect(evaluate({ context, resource })).toEqual({
      visible: false,
      allowed: false,
    });
  });

  it("requires visibility and the action permission on one matching policy", () => {
    const visibleRole = createRole();
    const actionOnlyRole = createRole({
      permissions: ["LOOTLOG_TIMERS_DELETE"],
    });

    expect(
      evaluate({
        context: createContext({ roles: [visibleRole, actionOnlyRole] }),
        actionPermission: "LOOTLOG_TIMERS_DELETE",
      }),
    ).toEqual({ visible: true, allowed: false });

    expect(
      evaluate({
        context: createContext({
          roles: [
            createRole({
              permissions: ["LOOTLOG_TIMERS_READ", "LOOTLOG_TIMERS_DELETE"],
            }),
          ],
        }),
        actionPermission: "LOOTLOG_TIMERS_DELETE",
      }),
    ).toEqual({ visible: true, allowed: true });
  });
});
