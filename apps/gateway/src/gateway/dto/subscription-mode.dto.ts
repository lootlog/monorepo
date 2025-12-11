import { IsIn } from 'class-validator';
import { SubscriptionMode } from 'src/gateway/enums/subscription-mode.enum';

export class SubscriptionModeDto {
  @IsIn([SubscriptionMode.ALL, SubscriptionMode.SINGLE])
  mode: SubscriptionMode;
}
