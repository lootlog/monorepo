import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  reservationId: string;
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  createdDate: Date;
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  fromDate: Date;
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  toDate: Date;
  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
