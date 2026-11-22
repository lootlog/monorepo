export class Spring {
  x: number;
  y: number;
  vx = 0;
  vy = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

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
