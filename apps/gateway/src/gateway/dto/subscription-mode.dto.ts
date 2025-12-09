import { IsIn } from 'class-validator';
import type { SubscriptionMode } from 'src/gateway/types/socket-user.type';

export class SubscriptionModeDto {
  @IsIn(['all', 'single'])
  mode: SubscriptionMode;
}
