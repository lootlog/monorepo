import {
  registerDecorator,
  validate,
  type ValidationOptions,
  type ValidationArguments,
} from "class-validator";
import { CreateBattleFightEventWarriorDto } from "src/battles/dto/create-battle.dto";

export function ValidateWarriorsRecord(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "validateWarriorsRecord",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any) {
          if (!value || typeof value !== "object") {
            return false;
          }

          const teams = new Set<number>();

          for (const [key, warrior] of Object.entries(value)) {
            if (typeof key !== "string") {
              return false;
            }

            // Reject battles with NPC warriors (keys starting with minus sign)
            if (key.startsWith("-")) {
              return false;
            }

            if (!warrior || typeof warrior !== "object") {
              return false;
            }

            const warriorDto = new CreateBattleFightEventWarriorDto();
            Object.assign(warriorDto, warrior);

            const errors = await validate(warriorDto);
            if (errors.length > 0) {
              return false;
            }

            // Collect team numbers
            if ("team" in warrior && typeof warrior.team === "number") {
              teams.add(warrior.team);
            }
          }

          return teams.size > 1;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Record of warriors`;
        },
      },
    });
  };
}
