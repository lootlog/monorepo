/**
 * Proves that a subscriber received every sequenced federation frame.
 *
 * Publishers take the next number from one Redis counter atomically with
 * PUBLISH, so a hole in the numbers is a lost frame. Delivery through
 * Dragonfly's threads may reorder frames, so a hole counts as a loss only when
 * it stays open for the reorder window.
 */
export class FederationSequence {
  private contiguous: number | undefined;
  private readonly ahead = new Set<number>();
  private required: number | undefined;
  private deadline: number | undefined;

  constructor(private readonly reorderWindowMs: number) {}

  /**
   * Starts a subscription from the counter read after SUBSCRIBE. Returns
   * whether continuity is already proven; otherwise the frames up to
   * `published` must arrive within the reorder window.
   */
  resume(published: number, now: number): boolean {
    // Nothing published before the first subscription can reach it. A counter
    // below the last frame means Redis lost its data, and with it the channel.
    if (this.contiguous === undefined || published < this.contiguous) {
      this.rebase(published);

      return true;
    }

    this.require(published, now);

    return this.required === undefined;
  }

  /** Records a frame. Returns whether it closed the last open hole. */
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

  /**
   * Returns whether a hole outlived the reorder window. The frames are lost;
   * tracking continues from the highest frame seen.
   */
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
