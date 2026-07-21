import { getFixedT } from "@/i18n/get-fixed-t";
import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  getAirTagEffectiveRelation,
  type AirTagTarget,
} from "@lootlog/types";
import { airTagReceiveController } from "./air-tag-receive-controller";

export const AIR_TAG_TARGET_TTL_MS = 10_000;
export const AIR_TAG_FADE_START_MS = 3_000;

const DEFAULT_TILE_SIZE = 32;
const THREAT_COLOR = "#ff4d5e";
const NEUTRAL_COLOR = "#38bdf8";
const translateSettings = getFixedT("settings");

type MapSize = { x: number; y: number };

type AirTagDrawable = {
  draw: (context: CanvasRenderingContext2D) => void;
  getOrder: () => number;
  getAlwaysDraw: () => boolean;
};

type AirTagEngine = {
  apiData?: { CALL_DRAW_ADD_TO_RENDERER: string };
  renderer?: {
    add: (drawable: AirTagDrawable) => void;
    getHighestOrderWithoutSort?: () => number;
  };
  map?: {
    d?: { id?: number };
    offset?: [number, number];
    size?: MapSize;
    getOffset?: () => [number, number];
  };
  miniMapController?: {
    handHeldMiniMapController?: {
      getHandHeldMiniMapWindow?: () => {
        getCtx?: () => CanvasRenderingContext2D;
        getMargin?: () => { left: number; top: number };
        getSquareData?: () => { normalSize: number };
      };
    };
  };
};

type AirTagApi = {
  addCallbackToEvent: (event: string, callback: () => void) => void;
  removeCallbackFromEvent: (event: string, callback: () => void) => void;
};

type AirTagWindow = Window & {
  Engine?: AirTagEngine;
  API?: AirTagApi;
  CFG?: { tileSize?: number };
};

export const getAirTagMarkerAlpha = (ageMs: number): number => {
  if (ageMs <= AIR_TAG_FADE_START_MS) return 1;
  if (ageMs >= AIR_TAG_TARGET_TTL_MS) return 0;

  return (
    1 -
    (ageMs - AIR_TAG_FADE_START_MS) /
      (AIR_TAG_TARGET_TTL_MS - AIR_TAG_FADE_START_MS)
  );
};

export class AirTagRenderer {
  private readonly drawable: AirTagDrawable;
  private readonly now: () => number;
  private registeredEvent: string | null = null;
  private expiryTimeoutId: number | null = null;
  private enabled = false;
  private unsubscribeTargets: (() => void) | null = null;
  private frameTargets: AirTagTarget[] = [];
  private frameTime = 0;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
    this.drawable = {
      draw: (context) => this.drawMainMap(context),
      getOrder: () =>
        this.getEngine()?.renderer?.getHighestOrderWithoutSort?.() ?? 10,
      getAlwaysDraw: () => true,
    };
  }

  register(): boolean {
    const gameWindow = window as AirTagWindow;
    const event = gameWindow.Engine?.apiData?.CALL_DRAW_ADD_TO_RENDERER;
    if (!event || !gameWindow.API || this.enabled) return false;

    this.enabled = true;
    this.unsubscribeTargets = airTagReceiveController.subscribe(
      this.refreshDrawRegistration,
    );
    this.refreshDrawRegistration();
    return true;
  }

  unregister(): void {
    this.enabled = false;
    this.unsubscribeTargets?.();
    this.unsubscribeTargets = null;
    this.cancelExpiry();
    this.detachDrawRegistration();
    this.frameTargets = [];
  }

  private readonly handleDrawFrame = () => {
    this.frameTime = this.now();
    this.frameTargets = airTagReceiveController.getRenderableTargets(
      this.frameTime,
      AIR_TAG_TARGET_TTL_MS,
    );
    if (this.frameTargets.length === 0) {
      this.cancelExpiry();
      this.detachDrawRegistration();
      return;
    }

    const hasClanEnemy = this.frameTargets.some(
      (target) =>
        getAirTagEffectiveRelation(
          target,
          this.frameTime,
          AIR_TAG_TARGET_TTL_MS,
        ) === AIR_TAG_CLAN_ENEMY_RELATION,
    );
    if (hasClanEnemy) {
      this.getEngine()?.renderer?.add(this.drawable);
    }
    this.drawHandheldMiniMap();
  };

  private drawMainMap(context: CanvasRenderingContext2D): void {
    const engine = this.getEngine();
    const offset = engine?.map?.getOffset?.() ?? engine?.map?.offset;
    const size = engine?.map?.size;
    if (!offset || !size) return;

    const tileSize =
      (window as AirTagWindow).CFG?.tileSize ?? DEFAULT_TILE_SIZE;
    const halfTileSize = tileSize / 2;
    for (const target of this.frameTargets) {
      if (
        getAirTagEffectiveRelation(
          target,
          this.frameTime,
          AIR_TAG_TARGET_TTL_MS,
        ) !== AIR_TAG_CLAN_ENEMY_RELATION ||
        !this.isWithinMap(target, size)
      ) {
        continue;
      }

      const x = target.x * tileSize + halfTileSize - offset[0];
      const y = target.y * tileSize + halfTileSize - offset[1];
      this.drawMainMarker(context, target, x, y);
    }
  }

  private drawHandheldMiniMap(): void {
    const engine = this.getEngine();
    const size = engine?.map?.size;
    const miniMapWindow =
      engine?.miniMapController?.handHeldMiniMapController?.getHandHeldMiniMapWindow?.();
    const context = miniMapWindow?.getCtx?.();
    const margin = miniMapWindow?.getMargin?.();
    const squareData = miniMapWindow?.getSquareData?.();
    if (
      !size ||
      !context ||
      !margin ||
      !squareData ||
      squareData.normalSize <= 0
    ) {
      return;
    }

    const radius = Math.min(5, Math.max(2.5, squareData.normalSize * 0.9));
    for (const target of this.frameTargets) {
      if (!this.isWithinMap(target, size)) continue;

      const relation = getAirTagEffectiveRelation(
        target,
        this.frameTime,
        AIR_TAG_TARGET_TTL_MS,
      );
      const color =
        relation === AIR_TAG_ENEMY_RELATION ||
        relation === AIR_TAG_CLAN_ENEMY_RELATION
          ? THREAT_COLOR
          : NEUTRAL_COLOR;
      const x = margin.left + (target.x + 0.5) * squareData.normalSize;
      const y = margin.top + (target.y + 0.5) * squareData.normalSize;
      const alpha = getAirTagMarkerAlpha(this.frameTime - target.observedAt);

      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.strokeStyle = "rgba(0, 0, 0, 0.8)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    }
  }

  private drawMainMarker(
    context: CanvasRenderingContext2D,
    target: AirTagTarget,
    x: number,
    y: number,
  ): void {
    const ageMs = Math.max(0, this.frameTime - target.observedAt);
    const alpha = getAirTagMarkerAlpha(ageMs);
    const ageSeconds = Math.floor(ageMs / 1_000);
    const targetLabel = target.clan
      ? `${target.nickname} · ${target.clan.name}`
      : target.nickname;
    const seenLabel = translateSettings("airTags.seenSeconds", {
      seconds: ageSeconds,
    });

    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = THREAT_COLOR;
    context.fillStyle = "rgba(255, 77, 94, 0.22)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 12, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.font = "bold 11px Arial";
    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 0, 0, 0.9)";
    context.strokeText(targetLabel, x, y - 17);
    context.fillStyle = "#ffffff";
    context.fillText(targetLabel, x, y - 17);
    context.font = "10px Arial";
    context.strokeText(seenLabel, x, y - 5);
    context.fillStyle = THREAT_COLOR;
    context.fillText(seenLabel, x, y - 5);
    context.restore();
  }

  private isWithinMap(target: AirTagTarget, size: MapSize): boolean {
    return (
      target.x >= 0 && target.y >= 0 && target.x < size.x && target.y < size.y
    );
  }

  private getEngine(): AirTagEngine | undefined {
    return (window as AirTagWindow).Engine;
  }

  private readonly refreshDrawRegistration = () => {
    if (!this.enabled) return;

    const targets = airTagReceiveController.getRenderableTargets(
      this.now(),
      AIR_TAG_TARGET_TTL_MS,
    );
    if (targets.length === 0) {
      this.cancelExpiry();
      this.detachDrawRegistration();
      return;
    }

    this.scheduleExpiry(targets);
    if (this.registeredEvent) return;
    const gameWindow = window as AirTagWindow;
    const event = gameWindow.Engine?.apiData?.CALL_DRAW_ADD_TO_RENDERER;
    if (!event || !gameWindow.API) return;

    gameWindow.API.addCallbackToEvent(event, this.handleDrawFrame);
    this.registeredEvent = event;
  };

  private scheduleExpiry(targets: readonly AirTagTarget[]): void {
    this.cancelExpiry();
    if (!this.enabled || targets.length === 0) return;

    const now = this.now();
    const nearestExpiryAt = targets.reduce(
      (earliestExpiryAt, target) =>
        Math.min(earliestExpiryAt, target.observedAt + AIR_TAG_TARGET_TTL_MS),
      Number.POSITIVE_INFINITY,
    );
    this.expiryTimeoutId = window.setTimeout(
      () => {
        this.expiryTimeoutId = null;
        this.refreshDrawRegistration();
      },
      Math.max(0, Math.ceil(nearestExpiryAt - now)),
    );
  }

  private cancelExpiry(): void {
    if (this.expiryTimeoutId === null) return;
    window.clearTimeout(this.expiryTimeoutId);
    this.expiryTimeoutId = null;
  }

  private detachDrawRegistration(): void {
    const gameWindow = window as AirTagWindow;
    if (this.registeredEvent && gameWindow.API) {
      gameWindow.API.removeCallbackFromEvent(
        this.registeredEvent,
        this.handleDrawFrame,
      );
    }
    this.registeredEvent = null;
  }
}

export const airTagRenderer = new AirTagRenderer();
