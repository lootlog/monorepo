import type { Contract, FieldOutputTypes } from "../../prisma/contract.js";

type Role = FieldOutputTypes["public"]["Role"];
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

export type ChatMessageViewer = {
  discordId: string;
  permissions: Permission[];
  roles: Role[];
};
