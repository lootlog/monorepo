import type { Contract } from "../../prisma/contract.js";

type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];
type Profession =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Profession"]["values"][number];

export type LootNpcDto = {
  id: number;
  name: string;
  wt: number | null;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  type: NpcType | null;
  margonemType: number | null;
};
