export class FederationSequence {
  private contiguous: number | undefined;
  private readonly ahead = new Set<number>();
  private required: number | undefined;
  private deadline: number | undefined;

  constructor(private readonly reorderWindowMs: number) {}

  resume(published: number, now: number): "intact" | "pending" | "lost" {
    if (this.contiguous === undefined) {
      this.rebase(published);

      return "intact";
    }

    if (published < this.contiguous) {
      this.rebase(published);

      return "lost";
    }

    this.require(published, now);

    return this.required === undefined ? "intact" : "pending";
  }

  observe(sequence: number, now: number): boolean {
    if (this.contiguous === undefined || sequence <= this.contiguous)
      return false;

    if (sequence === this.contiguous + 1) {
      this.contiguous = sequence;

      while (this.ahead.delete(this.contiguous + 1)) this.contiguous++;
    } else {
      this.ahead.add(sequence);
      this.require(sequence - 1, now);
    }

    if (this.required === undefined || this.contiguous < this.required)
      return false;
    this.required = undefined;
    this.deadline = undefined;

    return true;
  }

  expired(now: number): boolean {
    if (this.deadline === undefined || now < this.deadline) return false;
    this.rebase(
      Math.max(this.contiguous ?? 0, this.required ?? 0, ...this.ahead),
    );

    return true;
  }

  private require(sequence: number, now: number): void {
    if (this.contiguous !== undefined && this.contiguous >= sequence) return;
    this.required = Math.max(this.required ?? 0, sequence);
    this.deadline ??= now + this.reorderWindowMs;
  }

  private rebase(sequence: number): void {
    this.contiguous = sequence;
    this.ahead.clear();
    this.required = undefined;
    this.deadline = undefined;
  }
}
