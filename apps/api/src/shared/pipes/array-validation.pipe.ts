import { Injectable, type PipeTransform } from '@nestjs/common';

@Injectable()
export class ArrayValidationPipe implements PipeTransform {
  transform(value: string) {
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
