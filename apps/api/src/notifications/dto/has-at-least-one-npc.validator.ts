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
      propertyName: "npcNames",
      options: {
        message: Error.NOTIFICATION_RULE_MUST_TARGET_AT_LEAST_ONE_NPC,
        ...validationOptions,
      },
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const obj = args.object as {
            npcName?: string;
            npcNames?: string[];
          };
          const npcNameProvided = "npcName" in obj;
          const npcNamesProvided = "npcNames" in obj;

          if (!npcNameProvided && !npcNamesProvided) {
            return true;
          }

          return (
            typeof obj.npcName === "string" ||
            (Array.isArray(obj.npcNames) && obj.npcNames.length > 0)
          );
        },
      },
    });
  };
}
