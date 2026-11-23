export class RecentIds {
  private readonly ids = new Set<string>();

  constructor(private readonly capacity: number) {}

  add(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);

    if (this.ids.size > this.capacity) {
      const evicted = this.ids.values().next().value;

      if (evicted !== undefined) this.ids.delete(evicted);
    }

    return true;
  }
}
