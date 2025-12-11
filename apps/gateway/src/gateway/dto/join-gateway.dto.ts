import type { SocketUserPlayer } from 'src/gateway/types/socket-user.type';
import type { SubscriptionMode } from 'src/gateway/enums/subscription-mode.enum';

export class JoinGatewayDto {
  data: SocketUserPlayer;
  subscriptionMode?: SubscriptionMode;
  activeGuildId?: string;
}
