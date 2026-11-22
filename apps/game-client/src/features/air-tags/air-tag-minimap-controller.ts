import { rendererRuntimeAdapter } from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  MINIMAP_ICON,
  buildPlayerTipHtml,
  getMinimapClanEnemyStyle,
  getMinimapSquares,
  hasMinimapObjectAt,
  showMinimapTip,
  subscribeMinimapHover,
  type MinimapHoverEvent,
  type MinimapPlayerStyle,
  type MinimapSquares,
} from "@/lib/margonem-runtime/adapters/minimap-player-runtime-adapter";
import { getCanvasPoint } from "@/features/pings/map-ping-controller";
import { showsAirTagsOnMap } from "./air-tag-game-visibility";
import { airTagReceiveController } from "./air-tag-receive-controller";
import {
  AIR_TAG_TARGET_TTL_MS,
  getAirTagMemberSources,
  readUnseenAirTagEnemies,
} from "./air-tag-unseen-enemies";
import type { AirTagTarget } from "@lootlog/schema/air-tag";

/** Which enemies are unseen changes with every step; a marker may lag this long. */
const REFRESH_INTERVAL_MS = 250;

/** A sighting about to expire is drawn this faint; a fresh one is opaque. */
const OLDEST_ALPHA = 0.45;

// The game's own markers leave this much room for their outline.
const MARKER_PADDING = 5;

/**
 * A marker drawn like MiniMapObject.js draws its own: the icon and colour the
 * player chose for the kind, a white-centred gradient and a 1 px outline.
 */
const drawMarkerImage = (
  { color, icon }: MinimapPlayerStyle,
  { minSize, squareMargin }: Pick<MinimapSquares, "minSize" | "squareMargin">,
): HTMLCanvasElement => {
  const image = document.createElement("canvas");

  const side =
    icon === MINIMAP_ICON.rhomb ? Math.round(minSize + squareMargin) : minSize;

  image.width = side + MARKER_PADDING;
  image.height = side + MARKER_PADDING;

  const context = image.getContext("2d");

  if (!context) return image;

  const gradientSize = icon === MINIMAP_ICON.rhomb ? side : image.width;

  const gradient = context.createRadialGradient(
    0,
    0,
    0,
    0,
    0,
    Math.round(gradientSize * 0.6),
  );

  gradient.addColorStop(0, "white");
  gradient.addColorStop(1, color);
  context.fillStyle = gradient;
  context.lineWidth = 1;
  context.beginPath();

  if (icon === MINIMAP_ICON.circle) {
    context.arc(side / 2, side / 2, side / 2, 0, 2 * Math.PI);
    context.strokeStyle = "#003300";
  } else if (icon === MINIMAP_ICON.rhomb) {
    const half = Math.round(side / 2);

    context.moveTo(half, 0);
    context.lineTo(side, half);
    context.lineTo(half, side);
    context.lineTo(0, half);
    context.closePath();
    context.strokeStyle = "#003300";
  } else {
    context.rect(0, 0, side, side);
    context.strokeStyle = "black";
  }

  context.fill();
  context.stroke();

  return image;
};

type MarkerLabels = {
  /** The line under the game's tip saying who reported the player and when. */
  seen: (seconds: number) => string;
};

/**
 * Draws enemies other members see, and the hero does not, on the game's
 * handheld minimap, and answers a hover with the game's own player tip.
 * Runs in the game's frame only while such enemies are reported.
 */
export class AirTagMinimapController {
  private enabled = false;
  private labels: MarkerLabels = { seen: String };
  private enemies: AirTagTarget[] = [];
  private refreshedAt = 0;
  private unsubscribeDraw: (() => void) | null = null;
  private unsubscribeTargets: (() => void) | null = null;
  private unsubscribeHover: (() => void) | null = null;
  private releaseMembers: Array<() => void> = [];
  private hoverCanvas: HTMLCanvasElement | null = null;
  private readonly images = new Map<string, HTMLCanvasElement>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  setEnabled(enabled: boolean, labels: MarkerLabels): void {
    this.labels = labels;

    if (enabled === this.enabled) return;
    this.enabled = enabled;

    if (!enabled) {
      this.unsubscribeTargets?.();
      this.unsubscribeTargets = null;
      this.detach();

      return;
    }

    this.unsubscribeTargets = airTagReceiveController.subscribe(
      this.attachWhileReported,
    );
    this.attachWhileReported();
  }

  private readonly attachWhileReported = (): void => {
    // The next frame re-reads which enemies are unseen.
    this.refreshedAt = 0;

    if (this.unsubscribeDraw || !this.hasMarkersToDraw()) return;
    this.unsubscribeDraw = rendererRuntimeAdapter.subscribeDraw(this.drawFrame);

    // A member of another clan of the Organization is no enemy, and a presence
    // source knows its members only while someone holds it.
    this.releaseMembers = getAirTagMemberSources().map((source) =>
      source.subscribeChanges(this.forgetEnemies),
    );
  };

  /**
   * Members report enemies on every map, but only a red map shows them, so
   * elsewhere a reported enemy is no reason to run in the game's frame.
   */
  private hasMarkersToDraw(): boolean {
    return showsAirTagsOnMap() && airTagReceiveController.hasTargets();
  }

  /** The next frame re-reads which enemies are unseen. */
  private readonly forgetEnemies = (): void => {
    this.refreshedAt = 0;
  };

  private detach(): void {
    for (const release of this.releaseMembers) release();
    this.releaseMembers = [];
    this.unsubscribeDraw?.();
    this.unsubscribeDraw = null;
    this.unsubscribeHover?.();
    this.unsubscribeHover = null;
    this.hoverCanvas = null;
    this.enemies = [];
    this.images.clear();
  }

  private readonly drawFrame = (): void => {
    if (!this.hasMarkersToDraw()) {
      this.detach();

      return;
    }

    const now = this.now();

    if (now - this.refreshedAt >= REFRESH_INTERVAL_MS) {
      this.refreshedAt = now;
      this.enemies = readUnseenAirTagEnemies(now).enemies;
    }

    if (this.enemies.length === 0) return;
    const squares = getMinimapSquares();

    if (!squares) return;
    this.followHover(squares.canvas);

    const { context } = squares;

    const style = getMinimapClanEnemyStyle();

    // The player hid clan enemies on the minimap.
    if (!style) return;

    for (const enemy of this.enemies) {
      const { left, top } = this.getMarkerOrigin(enemy, squares);
      const age = Math.min(1, (now - enemy.observedAt) / AIR_TAG_TARGET_TTL_MS);

      context.globalAlpha = 1 - Math.max(0, age) * (1 - OLDEST_ALPHA);
      context.drawImage(this.getImage(style, squares), left, top);
    }

    context.globalAlpha = 1;
  };

  /** Where MiniMapObject.js puts the marker of a player on this tile. */
  private getMarkerOrigin(
    target: Pick<AirTagTarget, "x" | "y">,
    { margin, normalSize, squareMargin }: MinimapSquares,
  ) {
    return {
      left: Math.round(target.x * normalSize + margin.left - squareMargin),
      top: Math.round(target.y * normalSize + margin.top - squareMargin),
    };
  }

  private getImage(
    style: MinimapPlayerStyle,
    squares: MinimapSquares,
  ): HTMLCanvasElement {
    const key = `${style.icon}|${style.color}|${squares.minSize}|${squares.squareMargin}`;
    let image = this.images.get(key);

    if (!image) {
      image = drawMarkerImage(style, squares);
      this.images.set(key, image);
    }

    return image;
  }

  /** The game rebuilds its minimap window, and with it the canvas. */
  private followHover(canvas: HTMLCanvasElement): void {
    if (canvas === this.hoverCanvas) return;

    this.unsubscribeHover?.();
    this.hoverCanvas = canvas;
    this.unsubscribeHover = subscribeMinimapHover(canvas, this.handleHover);
  }

  private readonly handleHover = (event: MinimapHoverEvent): void => {
    if (this.enemies.length === 0) return;
    const squares = getMinimapSquares();

    if (!squares) return;
    const point = getCanvasPoint(squares.canvas, event.clientX, event.clientY);

    if (!point) return;

    const enemy = this.enemies.find((candidate) => {
      const { left, top } = this.getMarkerOrigin(candidate, squares);

      return (
        point.x >= left &&
        point.x < left + squares.minSize &&
        point.y >= top &&
        point.y < top + squares.minSize
      );
    });

    // The game's own marker on the tile keeps its tip.
    if (
      !enemy ||
      !getMinimapClanEnemyStyle() ||
      hasMinimapObjectAt(enemy.x, enemy.y)
    )
      return;

    const tip = buildPlayerTipHtml({
      nick: enemy.nickname,
      level: enemy.lvl,
      prof: enemy.prof,
      clanName: enemy.clan?.name,
    });

    if (!tip) return;

    const seconds = Math.max(
      0,
      Math.floor((this.now() - enemy.observedAt) / 1_000),
    );

    const seen = document.createElement("div");

    seen.className = "clan-in-tip";
    seen.textContent = this.labels.seen(seconds);
    showMinimapTip(event, tip + seen.outerHTML);
  };
}

export const airTagMinimapController = new AirTagMinimapController();
