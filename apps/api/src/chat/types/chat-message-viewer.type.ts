import { db as prismaDb } from "../../prisma/db.js";
import type { FieldOutputTypes } from "../../prisma/contract.js";

type Role = FieldOutputTypes["public"]["Role"];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

export type ChatMessageViewer = {
  discordId: string;
  permissions: Permission[];
  roles: Role[];
};
