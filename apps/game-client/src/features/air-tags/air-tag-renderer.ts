import { getFixedT } from "@/i18n/get-fixed-t";
import {
  rendererRuntimeAdapter,
  type RendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  AIR_TAG_CLAN_ENEMY_RELATION,
  AIR_TAG_ENEMY_RELATION,
  type AirTagTarget,
} from "@lootlog/schema/air-tag";
import { getAirTagEffectiveRelation } from "@lootlog/domain/air-tag";
import { airTagReceiveController } from "./air-tag-receive-controller";

export const AIR_TAG_TARGET_TTL_MS = 10_000;
export const AIR_TAG_FADE_START_MS = 3_000;

const THREAT_COLOR = "#ff4d5e";
const NEUTRAL_COLOR = "#38bdf8";
const translateSettings = getFixedT("settings");

type MapSize = { x: number; y: number };

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
  private readonly drawable: RuntimeDrawable;
  private readonly now: () => number;
  private unsubscribeDraw: (() => void) | null = null;
  private expiryTimeoutId: number | null = null;
  private enabled = false;
  private unsubscribeTargets: (() => void) | null = null;
  private frameTargets: AirTagTarget[] = [];
  private frameTime = 0;

  constructor(
    now: () => number = () => Date.now(),
    private readonly renderer: RendererRuntimeAdapter = rendererRuntimeAdapter,
  ) {
    this.now = now;
    this.drawable = {
      draw: (context) => this.drawMainMap(context),
      getOrder: () => this.renderer.getHighestOrder(),
      getAlwaysDraw: () => true,
    };
  }

  register(): boolean {
    if (!this.renderer.isAvailable() || this.enabled) return false;

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
      this.renderer.addDrawable(this.drawable);
    }
    this.drawHandheldMiniMap();
  };

  private drawMainMap(context: CanvasRenderingContext2D): void {
    const geometry = this.renderer.getMapGeometry();
    const offset = geometry?.offset;
    const size = geometry?.size;
    if (!offset || !size) return;

    const tileSize = geometry.tileSize;
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
    const size = this.renderer.getMapGeometry()?.size;
    const miniMap = this.renderer.getHandheldMiniMap();
    const context = miniMap?.context;
    const margin = miniMap?.margin;
    const normalSize = miniMap?.normalSize;
    if (!size || !context || !margin || !normalSize || normalSize <= 0) {
      return;
    }

    const radius = Math.min(5, Math.max(2.5, normalSize * 0.9));
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
      const x = margin.left + (target.x + 0.5) * normalSize;
      const y = margin.top + (target.y + 0.5) * normalSize;
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
    if (this.unsubscribeDraw) return;
    this.unsubscribeDraw = this.renderer.subscribeDraw(this.handleDrawFrame);
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
    this.unsubscribeDraw?.();
    this.unsubscribeDraw = null;
  }
}

export const airTagRenderer = new AirTagRenderer();
