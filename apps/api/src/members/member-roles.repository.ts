import type { FieldOutputTypes } from "../prisma/contract.js";
import type { PrismaService } from "#src/db/prisma.service";

type Member = FieldOutputTypes["public"]["Member"];
type Role = FieldOutputTypes["public"]["Role"];
export type MemberRole = Omit<Role, "permissions"> & {
  permissions: Array<NonNullable<Role["permissions"]>[number]>;
};

type DatabaseClient = Pick<PrismaService["db"], "orm">;

export type MemberWithRoles = Member & { roles: MemberRole[] };

export async function attachRolesToMembers<T extends { id: number }>(
  prisma: DatabaseClient,
  members: T[],
): Promise<Array<T & { roles: MemberRole[] }>> {
  if (members.length === 0) {
    return [];
  }

  const links = (await prisma.orm.public.MemberToRole.where((row) =>
    row.a.in(members.map((member) => member.id)),
  )
    .include("role")
    .all()) as unknown as Array<{ a: number; role: Role }>;
  const rolesByMemberId = new Map<number, MemberRole[]>();

  for (const link of links) {
    const roles = rolesByMemberId.get(link.a) ?? [];
    roles.push({
      ...link.role,
      ...(link.role.permissions && {
        permissions: [...link.role.permissions],
      }),
    } as MemberRole);
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
