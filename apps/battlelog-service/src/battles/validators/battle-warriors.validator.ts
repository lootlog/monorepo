import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  validate,
} from 'class-validator';
import { CreateBattleFightEventWarriorDto } from 'src/battles/dto/create-battle.dto';

export function ValidateWarriorsRecord(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateWarriorsRecord',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') {
            return false;
          }

          for (const [key, warrior] of Object.entries(value)) {
            if (typeof key !== 'string') {
              return false;
            }

            if (!warrior || typeof warrior !== 'object') {
              return false;
            }

            const warriorDto = new CreateBattleFightEventWarriorDto();
            Object.assign(warriorDto, warrior);

            const errors = await validate(warriorDto);
            if (errors.length > 0) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Record of warriors`;
        },
      },
    });
  };
}
