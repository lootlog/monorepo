import { Injectable, type PipeTransform } from "@nestjs/common";

@Injectable()
export class ArrayValidationPipe implements PipeTransform {
  transform(value: string) {
    if (!value?.length) {
      return [];
    }

    return value.split(",");
  }
}
