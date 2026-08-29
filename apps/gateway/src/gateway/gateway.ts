import { UseFilters } from "@nestjs/common";
import {
  BaseWsExceptionFilter,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server } from "socket.io";
import type { JoinGatewayDto } from "#src/gateway/dto/join-gateway.dto";
import type { RequestOnlinePlayersPresenceDto } from "#src/gateway/dto/request-online-players-presence.dto";
import type { RequestMemberWebPresenceDto } from "#src/gateway/dto/request-member-web-presence.dto";
import type { PlayerPresenceUpdateDto } from "#src/gateway/dto/player-presence-update.dto";
import type { RequestEventPresenceDto } from "#src/gateway/dto/request-event-presence.dto";
import type {
  AirTagObservationAck,
  AirTagObservationBatch,
  AirTagSubscriptionAck,
  MapPingAck,
} from "@lootlog/types";
import type { MapPingSendDto } from "#src/gateway/dto/map-ping-send.dto";
import type { AirTagObservationBatchDto } from "#src/gateway/dto/air-tag-observation.dto";
import type { AirTagSubscriptionDto } from "#src/gateway/dto/air-tag-subscription.dto";
import { GatewayEvent } from "#src/gateway/enums/gateway-event.enum";
import { GatewayConfig } from "#src/gateway/constants/gateway-config.constant";
import { UserPresenceStatus } from "#src/gateway/enums/user-presence-status.enum";
import {
  WsDiscordId,
  WsUserId,
} from "#src/shared/decorators/user-id.decorator";
import type {
  Socket,
  PlayerPresence,
} from "#src/gateway/types/socket-user.type";
import {
  type MemberWebPresenceFetchResponse,
  type PresenceFetchResponse,
  PresenceService,
} from "./services/presence.service.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { MapPingService } from "./services/map-ping.service.js";
import { AirTagService } from "./services/air-tag.service.js";

@WebSocketGateway({
  pingInterval: GatewayConfig.SOCKET_PING_INTERVAL_MS,
  pingTimeout: GatewayConfig.SOCKET_PING_TIMEOUT_MS,
})
export class Gateway {
  constructor(
    private presenceService: PresenceService,
    private subscriptionService: SubscriptionService,
    private mapPingService: MapPingService,
    private airTagService: AirTagService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.on(GatewayEvent.DISCONNECTING, async () => {
      if (client.data) {
        this.presenceService.emitDisconnectPresence(this.server, client);
        this.presenceService.emitMemberWebPresenceUpdate(
          this.server,
          client,
          UserPresenceStatus.OFFLINE,
        );

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
    { data: player, margonemAccountProof }: JoinGatewayDto,
  ): Promise<void> {
    const result = await this.subscriptionService.handleJoin(
      this.server,
      client,
      discordId,
      userId,
      player,
      margonemAccountProof,
    );

    client.emit(GatewayEvent.JOIN, result);
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH)
  async handleOnlinePlayersPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId, world }: RequestOnlinePlayersPresenceDto,
  ): Promise<PresenceFetchResponse<Record<string, unknown[]>>> {
    return this.presenceService.fetchOnlinePlayersPresence(
      this.server,
      client,
      guildId,
      world,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.MEMBER_WEB_PRESENCE_FETCH)
  async handleMemberWebPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId }: RequestMemberWebPresenceDto,
  ): Promise<MemberWebPresenceFetchResponse> {
    return this.presenceService.fetchMemberWebPresence(
      this.server,
      client,
      guildId,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.PLAYER_PRESENCE_UPDATE)
  handlePlayerPresenceUpdate(
    @WsDiscordId() discordId: string,
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PlayerPresenceUpdateDto,
  ): void {
    this.presenceService.updatePlayerPresence(
      client,
      discordId,
      data,
      this.server,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.MAP_PING_SEND)
  handleMapPing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MapPingSendDto,
  ): Promise<MapPingAck> {
    return this.mapPingService.send(this.server, client, data);
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.AIR_TAG_SUBSCRIPTION)
  handleAirTagSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AirTagSubscriptionDto,
  ): Promise<AirTagSubscriptionAck> {
    return this.airTagService.updateSubscription(this.server, client, data);
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.AIR_TAG_OBSERVATION)
  handleAirTagObservation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AirTagObservationBatchDto,
  ): Promise<AirTagObservationAck> {
    return this.airTagService.publishObservations(
      this.server,
      client,
      data as AirTagObservationBatch,
    );
  }

  @UseFilters(new BaseWsExceptionFilter())
  @SubscribeMessage(GatewayEvent.EVENT_PRESENCE_FETCH)
  async handleEventPresenceFetch(
    @ConnectedSocket() client: Socket,
    @MessageBody() { guildId, world }: RequestEventPresenceDto,
  ): Promise<PresenceFetchResponse<Record<string, PlayerPresence[]>>> {
    return this.presenceService.fetchEventPresence(
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
