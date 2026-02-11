export interface TutorialManager {
  init(): void;
  test(): void;
  // ... other methods
  [key: string]: any;
}

export interface CanvasMultiGlow {
  init(): void;
  setGlow(index: any): void;
  clearGlow(): void;
  addMultiGlowTarget(tutorialData: any, blink: boolean): void;
  removeMultiGlowTarget(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  setActive(active: boolean): void;
  [key: string]: any;
}

export interface HtmlMultiGlow {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface CanvasFocus {
  // Inferred
  init(): void;
  [key: string]: any;
}

export interface HtmlFocus {
  init(): void;
  update(dt: number): void;
  draw(): void;
  create($element: any, glow: boolean, blink: boolean): void;
  removeOverlayAndTarget(): void;
  [key: string]: any;
}
