import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../../prisma/contract.js";
import contractJson from "../../prisma/contract.json" with { type: "json" };

const nativeEnums = postgres<Contract>({ contractJson }).nativeEnums.public;

export const ActivitySource = nativeEnums.ActivitySource.members;
export type ActivitySource =
  (typeof ActivitySource)[keyof typeof ActivitySource];

export const ActivityType = nativeEnums.ActivityType.members;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
