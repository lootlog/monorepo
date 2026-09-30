// Margonem moves other players 5 tiles a second (`Other` speed).
const GLIDE_MS_PER_TILE = 200;

const MAX_GLIDE_MS = 1_000;

// Farther than a walk between two reports: a teleport or a long gap.
const SNAP_DISTANCE_TILES = 8;

type Glide = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startedAt: number;
  durationMs: number;
  frame: number;
};

/**
 * Glides each AirTag marker from where it is drawn to the newest reported
 * tile at walking speed, so a report a few tiles away does not make it jump.
 * It only interpolates: without a direction or speed in the report,
 * extrapolating would overshoot every stop and turn.
 */
export class AirTagMotion {
  private readonly glides = new Map<string, Glide>();
  private frame = 0;

  /** Targets not positioned between `beginFrame` and `endFrame` are forgotten. */
  beginFrame(): void {
    this.frame += 1;
  }

  endFrame(): void {
    for (const [targetId, glide] of this.glides) {
      if (glide.frame !== this.frame) this.glides.delete(targetId);
    }
  }

  clear(): void {
    this.glides.clear();
  }

  /** The drawn tile position; reused between calls, so read it before the next one. */
  position(
    target: {
      readonly targetId: string;
      readonly x: number;
      readonly y: number;
    },
    now: number,
  ): { readonly x: number; readonly y: number } {
    let glide = this.glides.get(target.targetId);

    if (!glide) {
      glide = {
        x: target.x,
        y: target.y,
        fromX: target.x,
        fromY: target.y,
        toX: target.x,
        toY: target.y,
        startedAt: now,
        durationMs: 0,
        frame: this.frame,
      };
      this.glides.set(target.targetId, glide);

      return glide;
    }

    glide.frame = this.frame;
    this.advance(glide, now);

    if (glide.toX !== target.x || glide.toY !== target.y) {
      const distance = Math.max(
        Math.abs(target.x - glide.x),
        Math.abs(target.y - glide.y),
      );

      glide.fromX = glide.x;
      glide.fromY = glide.y;
      glide.toX = target.x;
      glide.toY = target.y;
      glide.startedAt = now;
      glide.durationMs =
        distance > SNAP_DISTANCE_TILES
          ? 0
          : Math.min(MAX_GLIDE_MS, distance * GLIDE_MS_PER_TILE);
      this.advance(glide, now);
    }

    return glide;
  }

  private advance(glide: Glide, now: number): void {
    const progress =
      glide.durationMs <= 0
        ? 1
        : Math.min(1, Math.max(0, (now - glide.startedAt) / glide.durationMs));

    glide.x = glide.fromX + (glide.toX - glide.fromX) * progress;
    glide.y = glide.fromY + (glide.toY - glide.fromY) * progress;
  }
}
