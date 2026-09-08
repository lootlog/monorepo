export class ImmediateIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    const rectangle = target.getBoundingClientRect();
    this.callback(
      [
        {
          target,
          time: 0,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: rectangle,
          intersectionRect: rectangle,
          rootBounds: null,
        },
      ],
      this,
    );
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
