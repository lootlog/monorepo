import { installTestCanvas } from "@/test/canvas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "./margonem-runtime/adapters/glow-runtime-adapter";
import { testRuntimeWindow } from "@/test/test-runtime-window";

let canvas: ReturnType<typeof installTestCanvas>;

const originalWindowEngine = testRuntimeWindow.Engine;

function createOther(id: string) {
  return {
    d: {
      account: 1,
      icon: "other.gif",
      id,
      lvl: 300,
      nick: `Other ${id}`,
      prof: "w",
      x: 10,
      y: 10,
    },
    fh: 48,
    fw: 32,
    rx: 10,
    ry: 10,
    update: (_dt: number) => {},
  } satisfies Other & {
    fh: number;
    fw: number;
    rx: number;
    ry: number;
    update: (dt: number) => void;
  };
}

type TestOther = ReturnType<typeof createOther>;

type NativeGlow = {
  draw: (context: CanvasRenderingContext2D) => void;
  master: TestOther;
  update: () => void;
  updateColor: () => void;
};

type NativeMark = { getColor: () => string; getTypeObject: () => string };

type Drawable =
  | "base"
  | TestOther
  | NativeGlow
  | NativeMark
  | { draw: (context: CanvasRenderingContext2D) => void };

let runtime: ReturnType<typeof setRuntime>;

const getRuntimeDrawableList = () => runtime.others.getDrawableList();

function moveOther(
  other: TestOther,
  position: { rx: number; ry: number; x: number; y: number },
): void {
  other.rx = position.rx;
  other.ry = position.ry;
  other.d.x = position.x;
  other.d.y = position.y;
}

function setOtherUpdate(
  other: TestOther,
  update: (this: TestOther, dt: number) => void,
): void {
  other.update = update;
}

function setRuntime(drawables: Drawable[] = ["base"]) {
  const getDrawableList = vi.fn<() => Drawable[]>(() => drawables);

  const engine = {
    imgLoader: {
      onload: vi.fn<
        (
          path: string,
          options: false,
          beforeOnload: (image: HTMLImageElement) => void,
          afterOnload: (image: HTMLImageElement) => void,
        ) => void
      >((_path, _options, beforeOnload, afterOnload) => {
        const image = document.createElement("img");
        const mask = canvas.create(36, 52);
        mask.context.fillStyle = "white";
        mask.context.fillRect(0, 0, 36, 52);
        canvas.registerLoadedImage(image, mask.canvas);
        beforeOnload(image);
        afterOnload(image);
      }),
    },
    map: {
      offset: [0, 0],
      water: {},
    },
    mapShift: {
      getShift: () => [0, 0],
    },
    others: {
      getDrawableList,
    },
  };

  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: engine,
  });
  runtime = engine;

  return engine;
}

describe("lootlogOtherGlowManager", () => {
  beforeEach(() => {
    lootlogOtherGlowManager.cleanup();
    canvas = installTestCanvas();
    setRuntime();
  });

  afterEach(() => {
    lootlogOtherGlowManager.cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
  });

  it("appends managed glows to Engine.others drawable list without replacing base drawables", () => {
    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(
      createOther("617"),
      LOOTLOG_OTHER_GLOW_BLUE,
    );

    const drawables = getRuntimeDrawableList();

    expect(drawables[0]).toBe("base");
    expect(drawables).toHaveLength(2);
    expect(lootlogOtherGlowManager.getGlowColor("617")).toBe(
      LOOTLOG_OTHER_GLOW_BLUE,
    );
  });

  it("ignores flat other handles from the legacy interface", () => {
    const flatOther = {
      account: 1,
      icon: "other.gif",
      id: "617",
      lvl: 300,
      nick: "Other 617",
      prof: "w",
    };

    expect(() =>
      lootlogOtherGlowManager.setGlow(flatOther, LOOTLOG_OTHER_GLOW_BLUE),
    ).not.toThrow();
    expect(lootlogOtherGlowManager.getGlowCount()).toBe(0);
  });

  it("updates colors and clears only managed glows", () => {
    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(
      createOther("617"),
      LOOTLOG_OTHER_GLOW_BLUE,
    );
    lootlogOtherGlowManager.setGlow(
      createOther("617"),
      LOOTLOG_OTHER_GLOW_RED_ORANGE,
    );

    expect(lootlogOtherGlowManager.getGlowCount()).toBe(1);
    expect(lootlogOtherGlowManager.getGlowColor("617")).toBe(
      LOOTLOG_OTHER_GLOW_RED_ORANGE,
    );

    lootlogOtherGlowManager.clear();

    expect(getRuntimeDrawableList()).toEqual(["base"]);
  });

  it("updates managed glow position before returning Engine.others drawable list", () => {
    const other = createOther("617");

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    moveOther(other, { rx: 13, ry: 14, x: 13, y: 14 });
    getRuntimeDrawableList();

    expect(lootlogOtherGlowManager.getGlowPosition("617")).toEqual({
      x: 13,
      y: 14,
    });
    expect(lootlogOtherGlowManager.getGlowOrder("617")).toBe(14.1);
  });

  it("updates managed glow position after runtime Other.update movement", () => {
    const other = createOther("617");

    const originalUpdate = vi.fn<(this: TestOther, dt: number) => void>(
      function (this: TestOther, dt: number) {
        moveOther(this, { rx: 17 + dt, ry: 18 + dt, x: 17 + dt, y: 18 + dt });
      },
    );

    setOtherUpdate(other, originalUpdate);

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    other.update(2);

    expect(originalUpdate).toHaveBeenCalledWith(2);
    expect(lootlogOtherGlowManager.getGlowPosition("617")).toEqual({
      x: 19,
      y: 20,
    });
    expect(lootlogOtherGlowManager.getGlowOrder("617")).toBe(20.1);
  });

  it("restores runtime Other.update when managed glow is removed", () => {
    const other = createOther("617");
    const originalUpdate = vi.fn<(dt: number) => void>();
    setOtherUpdate(other, originalUpdate);

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    expect(other.update).not.toBe(originalUpdate);

    lootlogOtherGlowManager.removeGlow("617");

    expect(other.update).toBe(originalUpdate);
  });

  it("draws managed glow using the latest runtime other position", () => {
    const other = createOther("617");
    const context = canvas.create().context;
    const drawImage = vi.spyOn(context, "drawImage");

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);
    const glow = getRuntimeDrawableList()[1];

    if (!glow || glow === "base" || !("draw" in glow))
      throw new Error("Expected glow drawable");

    drawImage.mockClear();
    moveOther(other, { rx: 20, ry: 21, x: 20, y: 21 });

    glow.draw(context);

    expect(drawImage).toHaveBeenLastCalledWith(
      expect.any(HTMLCanvasElement),
      637,
      652,
      36,
      52,
    );
    expect(Array.from(context.getImageData(640, 660, 1, 1).data)).toEqual([
      62, 209, 222, 255,
    ]);
  });

  it("suppresses native Margonem other glows while keeping other drawables and Lootlog glows", () => {
    const other = createOther("617");

    const nativeMaskGlow = {
      draw: vi.fn<(context: CanvasRenderingContext2D) => void>(),
      master: other,
      update: vi.fn<() => void>(),
      updateColor: vi.fn<() => void>(),
    };

    const nativeColorMark = {
      getColor: vi.fn<() => string>(() => "green"),
      getTypeObject: vi.fn<() => string>(() => "OTHER_NAVIGATE"),
    };

    setRuntime([other, nativeMaskGlow, nativeColorMark]);

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setNativeGlowSuppressed(true);
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    const drawables = getRuntimeDrawableList();

    expect(drawables).toHaveLength(2);
    expect(drawables[0]).toBe(other);
    expect(drawables).not.toContain(nativeMaskGlow);
    expect(drawables).not.toContain(nativeColorMark);
    expect(lootlogOtherGlowManager.getNativeGlowSuppressed()).toBe(true);
  });
});
