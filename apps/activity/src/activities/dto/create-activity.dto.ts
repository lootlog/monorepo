import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateActivityDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  discordId: string;
}
