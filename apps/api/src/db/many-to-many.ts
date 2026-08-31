import type { PrismaService } from "#src/db/prisma.service";
import type { Member, Role } from "#src/db/domain";

type DatabaseClient = Pick<PrismaService["db"], "orm">;
type MemberWithRoles = Member & { roles: Role[] };

export async function attachRolesToMembers<T extends { id: number }>(
  prisma: DatabaseClient,
  members: T[],
): Promise<Array<T & { roles: Role[] }>> {
  if (members.length === 0) {
    return [];
  }

  const links = (await prisma.orm.public.MemberToRole.where((row) =>
    row.a.in(members.map((member) => member.id)),
  )
    .include("role")
    .all()) as unknown as Array<{ a: number; role: Role }>;
  const rolesByMemberId = new Map<number, Role[]>();

  for (const link of links) {
    const roles = rolesByMemberId.get(link.a) ?? [];
    roles.push(link.role);
    rolesByMemberId.set(link.a, roles);
  }

  return members.map((member) => ({
    ...member,
    roles: (rolesByMemberId.get(member.id) ?? []).sort(
      (leftRole, rightRole) =>
        (rightRole.position ?? 0) - (leftRole.position ?? 0),
    ),
  }));
}

export async function attachAssignedMembersToMaps<T extends { id: string }>(
  prisma: DatabaseClient,
  maps: T[],
): Promise<Array<T & { assignedMembers: any[] }>> {
  if (maps.length === 0) {
    return [];
  }

  const links = (await prisma.orm.public.EventMapToMember.where((row) =>
    row.a.in(maps.map((map) => map.id)),
  )
    .include("member")
    .all()) as unknown as Array<{ a: string; b: number; member: Member }>;
  const members = await attachRolesToMembers(
    prisma,
    links.map((link) => link.member),
  );
  const membersById = new Map(members.map((member) => [member.id, member]));
  const membersByMapId = new Map<string, MemberWithRoles[]>();

  for (const link of links) {
    const member = membersById.get(link.b);
    if (!member) {
      continue;
    }
    const assignedMembers = membersByMapId.get(link.a) ?? [];
    assignedMembers.push(member);
    membersByMapId.set(link.a, assignedMembers);
  }

  return maps.map((map) => ({
    ...map,
    assignedMembers: membersByMapId.get(map.id) ?? [],
  }));
}

export async function setMemberRoles(
  prisma: DatabaseClient,
  memberId: number,
  roleIds: string[],
): Promise<void> {
  await prisma.orm.public.MemberToRole.where((row) =>
    row.a.eq(memberId),
  ).deleteAndCount();

  if (roleIds.length > 0) {
    await prisma.orm.public.MemberToRole.createAndCount(
      roleIds.map((roleId) => ({ a: memberId, b: roleId })),
    );
  }
}

export async function setMapAssignedMembers(
  prisma: DatabaseClient,
  mapId: string,
  memberIds: number[],
): Promise<void> {
  await prisma.orm.public.EventMapToMember.where((row) =>
    row.a.eq(mapId),
  ).deleteAndCount();

  if (memberIds.length > 0) {
    await prisma.orm.public.EventMapToMember.createAndCount(
      memberIds.map((memberId) => ({ a: mapId, b: memberId })),
    );
  }
}

export async function attachAssignedMembersToHeroes<
  T extends {
    maps?: Array<{ id: string }>;
    locations?: Array<{ maps: Array<{ id: string }> }>;
  },
>(prisma: DatabaseClient, heroes: T[]): Promise<T[]> {
  const maps = heroes.flatMap((hero) => [
    ...(hero.maps ?? []),
    ...(hero.locations ?? []).flatMap((location) => location.maps),
  ]);
  const hydratedMaps = await attachAssignedMembersToMaps(prisma, maps);
  const mapsById = new Map(hydratedMaps.map((map) => [map.id, map]));

  return heroes.map((hero) => ({
    ...hero,
    ...(hero.maps
      ? { maps: hero.maps.map((map) => mapsById.get(map.id) ?? map) }
      : {}),
    ...(hero.locations
      ? {
          locations: hero.locations.map((location) => ({
            ...location,
            maps: location.maps.map((map) => mapsById.get(map.id) ?? map),
          })),
        }
      : {}),
  }));
}
