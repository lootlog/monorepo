import type {
  SocketUserPlayer,
  SubscriptionMode,
} from 'src/gateway/types/socket-user.type';

export class JoinGatewayDto {
  data: SocketUserPlayer;
  subscriptionMode?: SubscriptionMode;
  activeGuildId?: string;
}
