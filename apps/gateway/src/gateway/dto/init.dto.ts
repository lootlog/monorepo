import { IsNotEmpty, IsString } from 'class-validator';

export class InitDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  user: {
    sub: string;
  };
}
