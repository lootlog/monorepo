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

type LootlogGlow = {
  d: { id: string; x?: number; y?: number };
  draw: (context: CanvasRenderingContext2D) => void;
  getColor: () => string;
  getOrder: () => number;
};

type Drawable =
  | "base"
  | TestOther
  | NativeGlow
  | NativeMark
  | LootlogGlow
  | { draw: (context: CanvasRenderingContext2D) => void };

let runtime: ReturnType<typeof setRuntime>;

const getRuntimeDrawableList = () => runtime.others.getDrawableList();

/** The Lootlog glows the game draws this frame, by character id. */
const drawnGlows = () =>
  new Map(
    getRuntimeDrawableList().flatMap((drawable) =>
      drawable !== "base" && "getColor" in drawable && "d" in drawable
        ? [[String(drawable.d.id), drawable]]
        : [],
    ),
  );

function moveOther(
  other: TestOther,
  position: { rx: number; ry: number; x: number; y: number },
): void {
  other.rx = position.rx;
  other.ry = position.ry;
  other.d.x = position.x;
  other.d.y = position.y;
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
    expect(drawnGlows().get("617")?.getColor()).toBe(LOOTLOG_OTHER_GLOW_BLUE);
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
    lootlogOtherGlowManager.install();
    expect(drawnGlows().size).toBe(0);
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

    expect(drawnGlows().size).toBe(1);
    expect(drawnGlows().get("617")?.getColor()).toBe(
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
    const glow = drawnGlows().get("617");

    expect(glow?.d).toMatchObject({ x: 13, y: 14 });
    expect(glow?.getOrder()).toBe(14.1);
  });

  it("draws managed glow using the latest runtime other position", () => {
    const other = createOther("617");
    const context = canvas.create().context;
    const drawImage = vi.spyOn(context, "drawImage");

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);
    getRuntimeDrawableList();

    // A frame moves characters before it collects and draws drawables.
    moveOther(other, { rx: 20, ry: 21, x: 20, y: 21 });
    const glow = getRuntimeDrawableList()[1];

    if (!glow || glow === "base" || !("draw" in glow))
      throw new Error("Expected glow drawable");

    drawImage.mockClear();
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

  it("loads the mask once and shares tinted masks across glows and Shift presses", () => {
    const context = canvas.create().context;
    const drawImage = vi.spyOn(context, "drawImage");

    const drawGlows = () => {
      drawImage.mockClear();

      for (const drawable of getRuntimeDrawableList()) {
        if (drawable !== "base" && "draw" in drawable) {
          drawable.draw(context);
        }
      }

      return drawImage.mock.calls.map(([source]) => source);
    };

    const press = () => {
      lootlogOtherGlowManager.install();
      lootlogOtherGlowManager.setGlow(
        createOther("617"),
        LOOTLOG_OTHER_GLOW_BLUE,
      );
      lootlogOtherGlowManager.setGlow(
        createOther("618"),
        LOOTLOG_OTHER_GLOW_BLUE,
      );
      lootlogOtherGlowManager.setGlow(
        createOther("619"),
        LOOTLOG_OTHER_GLOW_RED_ORANGE,
      );

      return drawGlows();
    };

    const [firstBlue, secondBlue, red] = press();
    lootlogOtherGlowManager.uninstall();
    const [nextPressBlue] = press();

    expect(runtime.imgLoader.onload).toHaveBeenCalledOnce();
    expect(secondBlue).toBe(firstBlue);
    expect(nextPressBlue).toBe(firstBlue);
    expect(red).not.toBe(firstBlue);
    expect(Array.from(context.getImageData(335, 320, 1, 1).data)).toEqual([
      255, 90, 47, 255,
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
  });
});
