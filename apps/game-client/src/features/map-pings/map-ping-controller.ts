import type { MapPingEvent, MapPingType } from "@lootlog/schema/map-ping";
import {
  rendererRuntimeAdapter,
  type RendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  getMapPingPresentation,
  type MapPingSymbol,
} from "./map-ping-presentation";

const MAIN_MAP_CANVAS_ID = "GAME_CANVAS";
const HANDHELD_MINI_MAP_CANVAS_CLASS = "handheld-mini-map-canvas";
const MAX_NETWORK_COORDINATE = 65_535;
const MAX_ACTIVE_MAP_PINGS = 256;

export type MapTile = { x: number; y: number };

type ActiveMapPing = {
  id: string;
  mapId: number;
  x: number;
  y: number;
  senderName: string;
  startedAt: number;
  type: MapPingType;
  typeLabel: string;
};

type MainMapGeometry = {
  offset: readonly [number, number];
  size: { x: number; y: number };
  tileSize: number;
};

type HandheldMiniMapGeometry = {
  margin: { left: number; top: number };
  normalSize: number;
  size: { x: number; y: number };
};

const getCanvasPoint = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) => {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  return {
    x: ((clientX - bounds.left) * canvas.width) / bounds.width,
    y: ((clientY - bounds.top) * canvas.height) / bounds.height,
  };
};

const isTileWithinMap = (tile: MapTile, size: { x: number; y: number }) =>
  Number.isInteger(tile.x) &&
  Number.isInteger(tile.y) &&
  tile.x >= 0 &&
  tile.y >= 0 &&
  tile.x <= MAX_NETWORK_COORDINATE &&
  tile.y <= MAX_NETWORK_COORDINATE &&
  tile.x < size.x &&
  tile.y < size.y;

export const resolveMainMapTile = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  geometry: MainMapGeometry,
): MapTile | null => {
  const point = getCanvasPoint(canvas, clientX, clientY);
  if (
    !point ||
    geometry.tileSize <= 0 ||
    geometry.size.x <= 0 ||
    geometry.size.y <= 0
  ) {
    return null;
  }

  const x = Math.floor((point.x + geometry.offset[0]) / geometry.tileSize);
  const y = Math.floor((point.y + geometry.offset[1]) / geometry.tileSize);

  return {
    x: Math.min(Math.max(x, 0), geometry.size.x - 1, MAX_NETWORK_COORDINATE),
    y: Math.min(Math.max(y, 0), geometry.size.y - 1, MAX_NETWORK_COORDINATE),
  };
};

export const resolveHandheldMiniMapTile = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  geometry: HandheldMiniMapGeometry,
): MapTile | null => {
  const point = getCanvasPoint(canvas, clientX, clientY);
  if (!point || geometry.normalSize <= 0) {
    return null;
  }

  const mapX = point.x - geometry.margin.left;
  const mapY = point.y - geometry.margin.top;
  const mapWidth = geometry.size.x * geometry.normalSize;
  const mapHeight = geometry.size.y * geometry.normalSize;
  if (mapX < 0 || mapY < 0 || mapX >= mapWidth || mapY >= mapHeight) {
    return null;
  }

  return {
    x: Math.floor(mapX / geometry.normalSize),
    y: Math.floor(mapY / geometry.normalSize),
  };
};

export const isMapPingSurface = (
  target: EventTarget | null,
): target is HTMLCanvasElement => {
  return (
    target instanceof HTMLCanvasElement &&
    (target.id === MAIN_MAP_CANVAS_ID ||
      target.classList.contains(HANDHELD_MINI_MAP_CANVAS_CLASS))
  );
};

export class MapPingController {
  private readonly activePings = new Map<string, ActiveMapPing>();
  private unsubscribeDraw: (() => void) | null = null;
  private expiryTimeoutId: number | null = null;
  private enabled = false;
  private readonly drawable: RuntimeDrawable;

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly renderer: RendererRuntimeAdapter = rendererRuntimeAdapter,
  ) {
    this.drawable = {
      draw: (context) => this.drawMainMap(context),
      getOrder: () => this.renderer.getHighestOrder(),
      getAlwaysDraw: () => true,
    };
  }

  register() {
    if (!this.renderer.isAvailable() || this.enabled) {
      return false;
    }

    this.enabled = true;
    this.ensureDrawRegistration();
    this.scheduleExpiry();
    return true;
  }

  unregister() {
    this.enabled = false;
    this.cancelExpiry();
    this.detachDrawRegistration();
    this.activePings.clear();
  }

  addOptimistic(
    tile: MapTile,
    mapId: number,
    senderName: string,
    type: MapPingType,
    typeLabel: string,
  ) {
    const id = `local-${crypto.randomUUID()}`;
    this.retainCapacityFor(id);
    this.activePings.set(id, {
      id,
      mapId,
      x: tile.x,
      y: tile.y,
      senderName,
      startedAt: this.now(),
      type,
      typeLabel,
    });
    this.ensureDrawRegistration();
    this.scheduleExpiry();
    return id;
  }

  addRemote(event: MapPingEvent, typeLabel: string) {
    if (this.activePings.has(event.pingId)) {
      return false;
    }

    this.retainCapacityFor(event.pingId);
    this.activePings.set(event.pingId, {
      id: event.pingId,
      mapId: event.mapId,
      x: event.x,
      y: event.y,
      senderName: event.sender.name,
      startedAt: this.now(),
      type: event.type,
      typeLabel,
    });
    this.ensureDrawRegistration();
    this.scheduleExpiry();
    return true;
  }

  remove(id: string) {
    this.activePings.delete(id);
    if (this.activePings.size === 0) {
      this.cancelExpiry();
      this.detachDrawRegistration();
      return;
    }
    this.scheduleExpiry();
  }

  clear() {
    this.activePings.clear();
    this.cancelExpiry();
    this.detachDrawRegistration();
  }

  resolveTile(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const geometry = this.renderer.getMapGeometry();
    const size = geometry?.size;
    if (!geometry || !size) {
      return null;
    }

    if (canvas.id === MAIN_MAP_CANVAS_ID) {
      const offset = geometry.offset;
      if (!offset) {
        return null;
      }

      return resolveMainMapTile(canvas, clientX, clientY, {
        offset,
        size,
        tileSize: geometry.tileSize,
      });
    }

    if (!canvas.classList.contains(HANDHELD_MINI_MAP_CANVAS_CLASS)) {
      return null;
    }

    const miniMap = this.renderer.getHandheldMiniMap();
    const margin = miniMap?.margin;
    const normalSize = miniMap?.normalSize;
    if (!margin || !normalSize) {
      return null;
    }

    return resolveHandheldMiniMapTile(canvas, clientX, clientY, {
      margin,
      normalSize,
      size,
    });
  }

  isTileValid(tile: MapTile) {
    const size = this.renderer.getMapGeometry()?.size;
    return Boolean(size && isTileWithinMap(tile, size));
  }

  private readonly handleDrawFrame = () => {
    this.pruneExpired();
    if (this.activePings.size === 0) {
      this.cancelExpiry();
      this.detachDrawRegistration();
      return;
    }

    this.scheduleExpiry();
    this.renderer.addDrawable(this.drawable);
    this.drawHandheldMiniMap();
  };

  private drawMainMap(context: CanvasRenderingContext2D) {
    const geometry = this.renderer.getMapGeometry();
    const offset = geometry?.offset;
    const currentMapId = geometry?.id;
    if (!offset || currentMapId === undefined) {
      return;
    }

    const tileSize = geometry.tileSize;
    const halfTileSize = tileSize / 2;
    for (const ping of this.activePings.values()) {
      if (ping.mapId !== currentMapId) {
        continue;
      }

      const x = ping.x * tileSize + halfTileSize - offset[0];
      const y = ping.y * tileSize + halfTileSize - offset[1];
      this.drawMarker(context, ping, x, y, 13, true);
    }
  }

  private drawHandheldMiniMap() {
    const currentMapId = this.renderer.getMapGeometry()?.id;
    const miniMap = this.renderer.getHandheldMiniMap();
    const context = miniMap?.context;
    const margin = miniMap?.margin;
    const normalSize = miniMap?.normalSize;
    if (
      currentMapId === undefined ||
      !context ||
      !margin ||
      !normalSize ||
      normalSize <= 0
    ) {
      return;
    }

    const radius = Math.min(14, Math.max(6, normalSize * 1.75));
    for (const ping of this.activePings.values()) {
      if (ping.mapId !== currentMapId) {
        continue;
      }

      const x = margin.left + (ping.x + 0.5) * normalSize;
      const y = margin.top + (ping.y + 0.5) * normalSize;
      this.drawMarker(context, ping, x, y, radius, false);
    }
  }

  private drawMarker(
    context: CanvasRenderingContext2D,
    ping: ActiveMapPing,
    x: number,
    y: number,
    baseRadius: number,
    showSender: boolean,
  ) {
    const elapsed = this.now() - ping.startedAt;
    const presentation = getMapPingPresentation(ping.type);
    const progress = Math.min(1, elapsed / presentation.durationMs);
    const pulse = 1 + Math.sin(elapsed / 120) * 0.18;

    context.save();
    context.globalAlpha = 1 - progress;
    context.strokeStyle = presentation.color;
    context.fillStyle = presentation.color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, baseRadius * pulse, 0, Math.PI * 2);
    context.stroke();
    this.drawSymbol(
      context,
      presentation.symbol,
      x,
      y,
      Math.max(4, baseRadius * 0.55),
    );

    if (showSender) {
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.lineWidth = 3;
      context.strokeStyle = "rgba(0, 0, 0, 0.85)";
      context.font = "bold 10px Arial";
      context.strokeText(ping.typeLabel, x, y - baseRadius - 17);
      context.fillStyle = presentation.color;
      context.fillText(ping.typeLabel, x, y - baseRadius - 17);
      context.font = "bold 11px Arial";
      context.strokeText(ping.senderName, x, y - baseRadius - 4);
      context.fillStyle = "#ffffff";
      context.fillText(ping.senderName, x, y - baseRadius - 4);
    }

    context.restore();
  }

  private drawSymbol(
    context: CanvasRenderingContext2D,
    symbol: MapPingSymbol,
    x: number,
    y: number,
    size: number,
  ) {
    context.save();
    context.strokeStyle = "#ffffff";
    context.fillStyle = "#ffffff";
    context.lineCap = "round";
    context.lineWidth = Math.max(1.5, size * 0.22);

    if (symbol === "exclamation") {
      context.font = `bold ${Math.max(10, size * 2)}px Arial`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("!", x, y + 1);
    } else if (symbol === "crosshair") {
      const radius = size * 0.62;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.moveTo(x - size, y);
      context.lineTo(x - radius * 0.45, y);
      context.moveTo(x + radius * 0.45, y);
      context.lineTo(x + size, y);
      context.moveTo(x, y - size);
      context.lineTo(x, y - radius * 0.45);
      context.moveTo(x, y + radius * 0.45);
      context.lineTo(x, y + size);
      context.stroke();
    } else if (symbol === "regroup") {
      context.beginPath();
      context.arc(x, y, size * 0.72, 0, Math.PI * 2);
      context.arc(x, y, size * 0.3, 0, Math.PI * 2);
      context.stroke();
    } else {
      const extent = size * 0.72;
      context.beginPath();
      context.moveTo(x - extent, y - extent);
      context.lineTo(x + extent, y + extent);
      context.moveTo(x + extent, y - extent);
      context.lineTo(x - extent, y + extent);
      context.stroke();
    }

    context.restore();
  }

  private pruneExpired() {
    const now = this.now();
    for (const [id, ping] of this.activePings) {
      const durationMs = getMapPingPresentation(ping.type).durationMs;
      if (now - ping.startedAt >= durationMs) {
        this.activePings.delete(id);
      }
    }
  }

  private retainCapacityFor(id: string): void {
    if (
      this.activePings.has(id) ||
      this.activePings.size < MAX_ACTIVE_MAP_PINGS
    ) {
      return;
    }

    const oldestId = this.activePings.keys().next().value;
    if (oldestId !== undefined) {
      this.activePings.delete(oldestId);
    }
  }

  private scheduleExpiry(): void {
    this.cancelExpiry();
    if (!this.enabled || this.activePings.size === 0) return;

    const now = this.now();
    let nearestExpiryAt = Number.POSITIVE_INFINITY;
    for (const ping of this.activePings.values()) {
      const expiresAt =
        ping.startedAt + getMapPingPresentation(ping.type).durationMs;
      nearestExpiryAt = Math.min(nearestExpiryAt, expiresAt);
    }

    this.expiryTimeoutId = window.setTimeout(
      () => {
        this.expiryTimeoutId = null;
        this.pruneExpired();
        if (this.activePings.size === 0) {
          this.detachDrawRegistration();
          return;
        }
        this.scheduleExpiry();
      },
      Math.max(0, Math.ceil(nearestExpiryAt - now)),
    );
  }

  private cancelExpiry(): void {
    if (this.expiryTimeoutId === null) return;
    window.clearTimeout(this.expiryTimeoutId);
    this.expiryTimeoutId = null;
  }

  private ensureDrawRegistration(): void {
    if (!this.enabled || this.unsubscribeDraw || this.activePings.size === 0) {
      return;
    }

    this.unsubscribeDraw = this.renderer.subscribeDraw(this.handleDrawFrame);
  }

  private detachDrawRegistration(): void {
    this.unsubscribeDraw?.();
    this.unsubscribeDraw = null;
  }
}

export const mapPingController = new MapPingController();
