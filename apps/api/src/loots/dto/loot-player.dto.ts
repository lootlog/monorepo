import type { Contract } from "../../prisma/contract.js";

type Profession =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Profession"]["values"][number];

export type LootPlayerDto = {
  id: string;
  name: string;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  characterId: number | null;
  accountId: number | null;
  hpp: number | null;
};
