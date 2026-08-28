import postgres from "@prisma/orm-postgres/runtime";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import type {
  Contract,
  FieldInputTypes,
  FieldOutputTypes,
} from "./generated/contract.js";
import contractJson from "./generated/contract.json";

const contractMetadata = postgres<Contract>({ contractJson });

export type { JsonValue };
export type InputJsonValue = JsonValue;

type ApplicationValue<T> = T extends
  | Temporal.Instant
  | Temporal.PlainDateTime
  | Temporal.PlainDate
  | Temporal.PlainTime
  ? Date
  : T extends readonly (infer Item)[]
    ? ApplicationValue<Item>[]
    : T extends object
      ? { -readonly [K in keyof T]: ApplicationValue<T[K]> }
      : T;

type PublicFields<T> = ApplicationValue<
  "_type" extends keyof T ? Omit<T, "_type"> & { type: T["_type"] } : T
>;

export namespace Prisma {
  export type InputJsonValue = JsonValue;
  export type ActivityWhereInput = Record<string, any>;
  export type ActivityActorSnapshotWhereInput = Record<string, any>;
  export type StringNullableFilter = Record<string, any>;
  export type TransactionClient =
    import("./application-client.js").ActivityApplicationTransaction;
}

export const ActivitySource =
  contractMetadata.nativeEnums.public.ActivitySource.members;
export type ActivitySource =
  (typeof ActivitySource)[keyof typeof ActivitySource];
export const ActivityType =
  contractMetadata.nativeEnums.public.ActivityType.members;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export type ActivityActorSnapshot = PublicFields<
  FieldOutputTypes["public"]["ActivityActorSnapshot"]
>;
export type ActivityActorSnapshotInput = PublicFields<
  FieldInputTypes["public"]["ActivityActorSnapshot"]
>;
export type Activity = PublicFields<FieldOutputTypes["public"]["Activity"]>;
export type ActivityInput = PublicFields<FieldInputTypes["public"]["Activity"]>;
export type MemberActivitySession = PublicFields<
  FieldOutputTypes["public"]["MemberActivitySession"]
>;
export type MemberActivitySessionInput = PublicFields<
  FieldInputTypes["public"]["MemberActivitySession"]
>;
export type MemberActivityStats = PublicFields<
  FieldOutputTypes["public"]["MemberActivityStats"]
>;
export type MemberActivityStatsInput = PublicFields<
  FieldInputTypes["public"]["MemberActivityStats"]
>;
