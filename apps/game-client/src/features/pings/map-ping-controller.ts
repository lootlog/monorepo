import type { MapPingEvent, MapPingType } from "@lootlog/schema/map-ping";
import {
  createNpcGlow,
  type NpcGlow,
} from "@/lib/margonem-runtime/adapters/glow-runtime-adapter";
import {
  rendererRuntimeAdapter,
  getMapCanvasCoordinate,
  getMiniMapCanvasCoordinate,
  type RendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  PING_ICONS,
  PING_TONES,
  getPingPresentation,
  type PingIconName,
} from "./ping-presentation";

const MAIN_MAP_CANVAS_ID = "GAME_CANVAS";

const HANDHELD_MINI_MAP_CANVAS_CLASS = "handheld-mini-map-canvas";

const MAX_NETWORK_COORDINATE = 65_535;

const MAX_ACTIVE_MAP_PINGS = 256;

export type MapTile = { x: number; y: number };

const iconPaths = new Map<PingIconName, Path2D>();

const getIconPath = (icon: PingIconName) => {
  let path = iconPaths.get(icon);

  if (!path) {
    path = new Path2D(PING_ICONS[icon]);
    iconPaths.set(icon, path);
  }

  return path;
};

type ActiveMapPing = {
  id: string;
  mapId: number;
  /** Set when the ping marks a monster rather than a tile. */
  npcId?: number;
  x: number;
  y: number;
  senderName: string;
  startedAt: number;
  type: MapPingType;
  typeLabel: string;
};

/** An attack ping on an NPC stays up longer: the team needs time to reach it. */
const NPC_PING_DURATION_MS = 8_000;

const getPingStyle = (ping: ActiveMapPing) =>
  ping.npcId === undefined
    ? {
        durationMs: getPingPresentation(ping.type).durationMs,
        presentation: getPingPresentation(ping.type),
      }
    : {
        durationMs: NPC_PING_DURATION_MS,
        presentation: getPingPresentation("attack"),
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
  private readonly npcGlows = new Map<string, NpcGlow>();

  constructor(
    private readonly now: () => number = () => performance.now(),
    private readonly renderer: RendererRuntimeAdapter = rendererRuntimeAdapter,
    private readonly createGlow: typeof createNpcGlow = createNpcGlow,
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
    this.npcGlows.clear();
  }

  addOptimistic(
    tile: MapTile,
    mapId: number,
    senderName: string,
    type: MapPingType,
    typeLabel: string,
    npcId?: number,
  ) {
    const id = `local-${crypto.randomUUID()}`;
    this.retainCapacityFor(id);
    this.activePings.set(id, {
      id,
      mapId,
      npcId,
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
      npcId: event.npcId,
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
    this.npcGlows.clear();
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

  /** The attackable NPC drawn under a point on the main map, if any. */
  resolveNpc(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
    const offset = this.renderer.getMapGeometry()?.offset;
    const point = getCanvasPoint(canvas, clientX, clientY);

    if (canvas.id !== MAIN_MAP_CANVAS_ID || !offset || !point) {
      return null;
    }

    return this.renderer.findAttackableNpcAt(
      point.x + offset[0],
      point.y + offset[1],
    );
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
    this.addNpcGlows();
    this.drawHandheldMiniMap();
  };

  /** Lights up each pinged monster's sprite, drawn just behind it. */
  private addNpcGlows() {
    const currentMapId = this.renderer.getMapGeometry()?.id;

    for (const id of this.npcGlows.keys()) {
      if (!this.activePings.has(id)) this.npcGlows.delete(id);
    }

    for (const ping of this.activePings.values()) {
      if (ping.npcId === undefined || ping.mapId !== currentMapId) {
        continue;
      }

      let glow = this.npcGlows.get(ping.id);

      if (!glow) {
        const tone = PING_TONES[getPingStyle(ping).presentation.tone];

        glow = this.createGlow(ping.npcId, tone.glow);
        this.npcGlows.set(ping.id, glow);
      }

      if (!glow.isPresent()) {
        continue;
      }

      const pulse = 0.75 + Math.sin((this.now() - ping.startedAt) / 180) * 0.25;
      glow.setAlpha(this.getFade(ping) * pulse);
      this.renderer.addDrawable(glow);
    }
  }

  /** Full strength for most of a ping's life, then a fade out. */
  private getFade(ping: ActiveMapPing) {
    const progress = Math.min(
      1,
      (this.now() - ping.startedAt) / getPingStyle(ping).durationMs,
    );

    return Math.min(1, (1 - progress) / 0.3);
  }

  private drawMainMap(context: CanvasRenderingContext2D) {
    const geometry = this.renderer.getMapGeometry();
    const offset = geometry?.offset;
    const currentMapId = geometry?.id;

    if (!offset || currentMapId === undefined) {
      return;
    }

    const tileSize = geometry.tileSize;

    for (const ping of this.activePings.values()) {
      if (ping.mapId !== currentMapId) {
        continue;
      }

      const npc =
        ping.npcId === undefined
          ? null
          : this.renderer.getNpcBounds(ping.npcId);

      if (npc) {
        // The sprite itself glows; float the badge above its name label.
        this.drawMarker(context, ping, {
          badgeAnchorY: npc.top - offset[1] - 14,
          baseRadius: 13,
          ground: false,
          groundY: npc.bottom - offset[1],
          showSender: true,
          x: (npc.left + npc.right) / 2 - offset[0],
        });
        continue;
      }

      // An NPC out of view falls back to its tile.
      const x = getMapCanvasCoordinate(ping.x, tileSize, offset[0]);
      const y = getMapCanvasCoordinate(ping.y, tileSize, offset[1]);
      this.drawMarker(context, ping, {
        badgeAnchorY: y,
        baseRadius: 13,
        ground: true,
        groundY: y,
        showSender: true,
        x,
      });
    }
  }

  private drawHandheldMiniMap() {
    const currentMapId = this.renderer.getMapGeometry()?.id;
    const miniMap = this.renderer.getHandheldMiniMap();

    if (!miniMap) return;
    const { context, margin, normalSize } = miniMap;

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

      const x = getMiniMapCanvasCoordinate(ping.x, normalSize, margin.left);
      const y = getMiniMapCanvasCoordinate(ping.y, normalSize, margin.top);
      this.drawMarker(context, ping, {
        badgeAnchorY: y,
        baseRadius: radius,
        ground: true,
        groundY: y,
        showSender: false,
        x,
      });
    }
  }

  private drawMarker(
    context: CanvasRenderingContext2D,
    ping: ActiveMapPing,
    placement: {
      /** The badge floats above this point. */
      badgeAnchorY: number;
      baseRadius: number;
      /** Draw the pulsing ellipse on the ground. */
      ground: boolean;
      /** Centre of the ground ellipse. */
      groundY: number;
      showSender: boolean;
      x: number;
    },
  ) {
    const {
      badgeAnchorY,
      baseRadius,
      ground,
      groundY: y,
      showSender,
      x,
    } = placement;

    const elapsed = this.now() - ping.startedAt;
    const { presentation } = getPingStyle(ping);
    const tone = PING_TONES[presentation.tone];
    const fade = this.getFade(ping);

    if (ground) {
      this.drawGround(context, tone.glow, x, y, baseRadius, elapsed, fade);
    }

    if (!showSender) {
      this.drawIcon(context, presentation.icon, x, y, baseRadius * 1.1);

      return;
    }

    context.save();
    context.globalAlpha = fade;

    // The badge drops onto the tile, then bobs gently.
    const drop = Math.max(0, 1 - elapsed / 260);
    const badgeRadius = 13;

    const badgeY =
      badgeAnchorY -
      22 -
      badgeRadius -
      drop * 30 +
      Math.sin(elapsed / 190) * 1.5;

    context.beginPath();
    context.arc(x, badgeY, badgeRadius + 1, 0, Math.PI * 2);
    context.fillStyle = "#150f0d";
    context.fill();
    context.beginPath();
    context.arc(x, badgeY, badgeRadius, 0, Math.PI * 2);
    context.fillStyle = tone.fill;
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = tone.border;
    context.stroke();
    this.drawIcon(context, presentation.icon, x, badgeY, 15);

    this.drawPlate(context, ping, tone.glow, x, badgeY - badgeRadius - 6);
    context.restore();
  }

  private drawGround(
    context: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    baseRadius: number,
    elapsed: number,
    fade: number,
  ) {
    context.save();
    context.globalAlpha = fade;
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 8;

    const radiusX = baseRadius * 1.3;
    const radiusY = baseRadius * 0.6;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();

    const pulse = (elapsed % 1_000) / 1_000;
    context.globalAlpha *= 1 - pulse;
    context.beginPath();
    context.ellipse(
      x,
      y,
      radiusX * (0.6 + pulse * 0.9),
      radiusY * (0.6 + pulse * 0.9),
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  private drawIcon(
    context: CanvasRenderingContext2D,
    icon: PingIconName,
    x: number,
    y: number,
    size: number,
  ) {
    const scale = size / 24;

    context.save();
    context.translate(x - size / 2, y - size / 2);
    context.scale(scale, scale);
    context.strokeStyle = "#ffffff";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.6;
    context.stroke(getIconPath(icon));
    context.restore();
  }

  /** The game's popup-menu plate: "sender · type" with a triple border. */
  private drawPlate(
    context: CanvasRenderingContext2D,
    ping: ActiveMapPing,
    accent: string,
    x: number,
    bottom: number,
  ) {
    const separator = " · ";
    context.font = "bold 11px Arimo, Arial, sans-serif";
    context.textBaseline = "middle";

    const senderWidth = context.measureText(ping.senderName).width;
    const separatorWidth = context.measureText(separator).width;
    const labelWidth = context.measureText(ping.typeLabel).width;
    const width = senderWidth + separatorWidth + labelWidth + 12;
    const height = 18;
    const left = Math.round(x - width / 2);
    const top = Math.round(bottom - height);

    context.fillStyle = "#150f0d";
    context.beginPath();
    context.roundRect(left - 2, top - 2, width + 4, height + 4, 5);
    context.fill();
    context.fillStyle = "#b6bbc1b0";
    context.beginPath();
    context.roundRect(left - 1, top - 1, width + 2, height + 2, 5);
    context.fill();
    context.fillStyle = "#3f3b3d";
    context.beginPath();
    context.roundRect(left, top, width, height, 4);
    context.fill();

    const textY = top + height / 2 + 0.5;
    let textX = left + 6;
    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.fillText(ping.senderName, textX, textY);
    textX += senderWidth;
    context.fillStyle = "#bebebe";
    context.fillText(separator, textX, textY);
    textX += separatorWidth;
    context.fillStyle = accent;
    context.fillText(ping.typeLabel, textX, textY);
  }

  private pruneExpired() {
    const now = this.now();

    for (const [id, ping] of this.activePings) {
      const { durationMs } = getPingStyle(ping);

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
      const expiresAt = ping.startedAt + getPingStyle(ping).durationMs;

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
