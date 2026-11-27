import { Schema } from "effect";

export const EQUIPMENT_SET_NAME_MAX_LENGTH = 60;

export const EquipmentSetName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(EQUIPMENT_SET_NAME_MAX_LENGTH),
);

export const EQUIPMENT_SET_DESCRIPTION_MAX_LENGTH = 500;

export const EquipmentSetDescription = Schema.Trim.check(
  Schema.isMaxLength(EQUIPMENT_SET_DESCRIPTION_MAX_LENGTH),
);

const EQUIPMENT_SET_CODE_MAX_LENGTH = 2_048;

export const EquipmentSetCode = Schema.String.check(
  Schema.isPattern(/^[\d_a-z.-]+$/u),
  Schema.isMaxLength(EQUIPMENT_SET_CODE_MAX_LENGTH),
);
