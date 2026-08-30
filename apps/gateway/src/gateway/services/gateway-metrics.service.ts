import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import {
  metrics,
  ValueType,
  type BatchObservableCallback,
  type Observable,
} from "@opentelemetry/api";
import { Gateway } from "#src/gateway/gateway";
import { Platform } from "#src/gateway/enums/platform.enum";
import type { SocketUser } from "#src/gateway/types/socket-user.type";

export type GatewayMetricSocket = {
  data: Pick<SocketUser, "platform" | "player" | "userId">;
};

type GatewayClusterMetrics = {
  connections: number;
  gameSessions: number;
  uniquePlayers: number;
};

export function summarizeGatewaySockets(
  sockets: readonly GatewayMetricSocket[],
): GatewayClusterMetrics {
  let gameSessions = 0;
  const uniquePlayerIds = new Set<string>();

  for (const { data } of sockets) {
    if (data.platform !== Platform.GAME || data.player === undefined) {
      continue;
    }

    gameSessions += 1;
    uniquePlayerIds.add(data.userId);
  }

  return {
    connections: sockets.length,
    gameSessions,
    uniquePlayers: uniquePlayerIds.size,
  };
}

@Injectable()
export class GatewayMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GatewayMetricsService.name);
  private readonly meter = metrics.getMeter("@lootlog/gateway");
  private readonly connections = this.meter.createObservableGauge(
    "lootlog.gateway.cluster.connections",
    {
      description:
        "Authenticated Socket.IO connections across the gateway cluster",
      unit: "{connection}",
      valueType: ValueType.INT,
    },
  );
  private readonly gameSessions = this.meter.createObservableGauge(
    "lootlog.gateway.cluster.game_sessions",
    {
      description: "Joined Margonem game sessions across the gateway cluster",
      unit: "{session}",
      valueType: ValueType.INT,
    },
  );
  private readonly uniquePlayers = this.meter.createObservableGauge(
    "lootlog.gateway.cluster.unique_players",
    {
      description:
        "Unique Lootlog users with a joined game session across the gateway cluster",
      unit: "{player}",
      valueType: ValueType.INT,
    },
  );
  private readonly instruments: Observable[] = [
    this.connections,
    this.gameSessions,
    this.uniquePlayers,
  ];
  private readonly observeClusterMetrics: BatchObservableCallback = async (
    observableResult,
  ) => {
    try {
      const sockets = await this.gateway.server.fetchSockets();
      const snapshot = summarizeGatewaySockets(sockets);

      observableResult.observe(this.connections, snapshot.connections);
      observableResult.observe(this.gameSessions, snapshot.gameSessions);
      observableResult.observe(this.uniquePlayers, snapshot.uniquePlayers);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to collect gateway cluster metrics: ${message}`);
    }
  };

  constructor(private readonly gateway: Gateway) {}

  onModuleInit(): void {
    this.meter.addBatchObservableCallback(
      this.observeClusterMetrics,
      this.instruments,
    );
  }

  onModuleDestroy(): void {
    this.meter.removeBatchObservableCallback(
      this.observeClusterMetrics,
      this.instruments,
    );
  }
}
