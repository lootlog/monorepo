import { UseFilters, Logger } from "@nestjs/common";
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server } from "socket.io";
import type { JoinGatewayDto } from "src/gateway/dto/join-gateway.dto";
import type { RequestServerPresenceDto } from "src/gateway/dto/request-server-presence.dto";
import type { EventPresenceUpdateDto } from "src/gateway/dto/event-presence-update.dto";
import type { RequestPlayerPresenceDto } from "src/gateway/dto/request-player-presence.dto";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { GatewayConfig } from "src/gateway/constants/gateway-config.constant";
import { RuntimeEnvironment } from "@lootlog/types";
import { WsDiscordId, WsUserId } from "src/shared/decorators/user-id.decorator";
import type {
  Socket,
  PlayerPresence,
} from "src/gateway/types/socket-user.type";
import {
  ConnectionService,
  PresenceService,
  SubscriptionService,
} from "./services";

@WebSocketGateway({
  namespace:
    process.env.ENV === RuntimeEnvironment.LOCAL ? "/gateway" : undefined,
  pingInterval: GatewayConfig.SOCKET_PING_INTERVAL_MS,
  pingTimeout: GatewayConfig.SOCKET_PING_TIMEOUT_MS,
})
export class Gateway {
  private readonly logger = new Logger(Gateway.name);

  constructor(
    private connectionService: ConnectionService,
    private presenceService: PresenceService,
    private subscriptionService: SubscriptionService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const { discordId, platform, userId } =
      this.connectionService.getConnectionMetadata(client.request);

    const validation = this.connectionService.validateConnection(
      discordId,
      platform,
    );
    if (!validation.valid) {
      return client.disconnect();
    }

    client.data = this.connectionService.initializeSocketData(
      discordId!,
      userId,
      client.id,
      platform,
    );

    client.on(GatewayEvent.DISCONNECTING, async () => {
      if (client.data) {
        this.presenceService.emitDisconnectPresence(client);

        if (client.data.guilds) {
          await this.subscriptionService.handleDisconnect(
            client,
            client.data.guilds,
          );
          await this.presenceService.broadcastPlayerDisconnect(
            this.server,
            client,
          );
        }
      }
    });
  }

  @SubscribeMessage(GatewayEvent.JOIN)
  async handleJoin(
    @WsDiscordId() discordId: string,
    @WsUserId() userId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody()
    { data: player }: JoinGatewayDto,
  ): Promise<void> {
    const result = await this.subscriptionService.handleJoin(
      this.server,
      client,
      discordId,
      userId,
      player,
    );

    client.emit(GatewayEvent.JOIN, result);
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.REQUEST_SERVER_PRESENCE)
  async handlePresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId, world }: RequestServerPresenceDto,
  ): Promise<Record<string, unknown[]>> {
    return this.presenceService.fetchServerPresence(
      this.server,
      client,
      guildId,
      world,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.PRESENCE_UPDATE)
  handlePresenceUpdate(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EventPresenceUpdateDto,
  ): void {
    this.presenceService.updatePlayerPresence(
      client,
      discordId,
      data,
      this.server,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.PRESENCE_FETCH)
  async handlePlayerPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId, world }: RequestPlayerPresenceDto,
  ): Promise<Record<string, PlayerPresence[]>> {
    return this.presenceService.fetchGuildPresence(
      this.server,
      client,
      guildId,
      world,
    );
  }

  async checkPresenceForMap(guildId: string, mapName: string): Promise<void> {
    await this.presenceService.checkPresenceForMap(
      this.server,
      guildId,
      mapName,
    );
  }
}
