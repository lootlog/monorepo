import { Schema } from "effect";
import { IsoDateTime } from "@lootlog/schema/primitives";
import {
  EquipmentSetCode,
  EquipmentSetDescription,
  EquipmentSetName,
} from "@lootlog/schema/equipment-sets";

export const UserEquipmentSetResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
  code: Schema.String,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
}).annotate({ identifier: "UserEquipmentSetResponseDto" });

export const UserEquipmentSetsResponse = Schema.Array(UserEquipmentSetResponse);

export const CreateUserEquipmentSetRequest = Schema.Struct({
  name: EquipmentSetName,
  description: Schema.optionalKey(EquipmentSetDescription),
  code: EquipmentSetCode,
}).annotate({ identifier: "CreateUserEquipmentSetDto" });

export type CreateUserEquipmentSetRequest =
  typeof CreateUserEquipmentSetRequest.Type;

export const UpdateUserEquipmentSetRequest = Schema.Struct({
  name: Schema.optionalKey(EquipmentSetName),
  description: Schema.optionalKey(EquipmentSetDescription),
  code: Schema.optionalKey(EquipmentSetCode),
}).annotate({ identifier: "UpdateUserEquipmentSetDto" });

export type UpdateUserEquipmentSetRequest =
  typeof UpdateUserEquipmentSetRequest.Type;

export const UserEquipmentSetParams = Schema.Struct({
  setId: Schema.String,
});
