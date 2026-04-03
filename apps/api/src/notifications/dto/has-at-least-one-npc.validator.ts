import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from "class-validator";
import { Error } from "src/notifications/enum/error.enum";

export function HasAtLeastOneNpc(validationOptions?: ValidationOptions) {
  return function (target: object) {
    registerDecorator({
      name: "hasAtLeastOneNpc",
      target: target.constructor,
      propertyName: "npcIds",
      options: {
        message: Error.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
        ...validationOptions,
      },
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as { npcId?: number; npcIds?: number[] };
          const npcIdProvided = "npcId" in obj;
          const npcIdsProvided = "npcIds" in obj;

          if (!npcIdProvided && !npcIdsProvided) {
            return true;
          }

          return (
            typeof obj.npcId === "number" ||
            (Array.isArray(obj.npcIds) && obj.npcIds.length > 0)
          );
        },
      },
    });
  };
}
