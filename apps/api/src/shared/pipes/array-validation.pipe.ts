import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ArrayValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (value === undefined || value.length === 0) {
      return [];
    }

    const values = value.split(',');
    if (values.length === 0) {
      return [];
    }

    return values;
  }
}
