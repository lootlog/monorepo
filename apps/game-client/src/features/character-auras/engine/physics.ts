/**
 * A damped spring in 2D: props hung on the character (cloud, moon, skulls, runes) follow it
 * through one, so they trail behind a walk and overshoot a little when it stops.
 */
export class Spring {
  x: number;
  y: number;
  vx = 0;
  vy = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Semi-implicit Euler step towards (tx, ty); stable for `dt` up to ~2/√stiffness. */
  step(tx: number, ty: number, dt: number, stiffness = 40, damping = 7): void {
    this.vx += ((tx - this.x) * stiffness - this.vx * damping) * dt;
    this.vy += ((ty - this.y) * stiffness - this.vy * damping) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  snap(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }
}
