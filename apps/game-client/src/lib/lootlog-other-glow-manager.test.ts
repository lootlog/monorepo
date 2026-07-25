import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "./margonem-runtime/adapters/glow-runtime-adapter";
import { testRuntimeWindow } from "@/test/test-runtime-window";

const originalWindowEngine = testRuntimeWindow.Engine;

function getRuntimeDrawableList(): unknown[] {
  return (
    testRuntimeWindow.Engine as unknown as {
      others: {
        getDrawableList: () => unknown[];
      };
    }
  ).others.getDrawableList();
}

function createOther(id: string): Other {
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
  } as unknown as Other;
}

function moveOther(
  other: Other,
  position: { rx: number; ry: number; x: number; y: number },
): void {
  const runtimeOther = other as Other & {
    d: Other["d"] & { x?: number; y?: number };
    rx?: number;
    ry?: number;
  };

  runtimeOther.rx = position.rx;
  runtimeOther.ry = position.ry;
  runtimeOther.d.x = position.x;
  runtimeOther.d.y = position.y;
}

function setOtherUpdate(
  other: Other,
  update: (this: Other, dt: number) => void,
): void {
  const runtimeOther = other as Other & {
    update?: (this: Other, dt: number) => void;
  };
  runtimeOther.update = update;
}

function setRuntime(drawables: unknown[] = ["base"]): ReturnType<typeof vi.fn> {
  const getDrawableList = vi.fn(() => drawables);

  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      imgLoader: {
        onload: vi.fn((_path, _options, beforeOnload, afterOnload) => {
          const image = document.createElement("img");
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
    },
  });

  return getDrawableList;
}

describe("lootlogOtherGlowManager", () => {
  beforeEach(() => {
    lootlogOtherGlowManager.cleanup();
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
      lootlogOtherGlowManager.setGlow(
        flatOther as unknown as Other,
        LOOTLOG_OTHER_GLOW_BLUE,
      ),
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
    const originalUpdate = vi.fn(function (this: Other, dt: number) {
      moveOther(this, { rx: 17 + dt, ry: 18 + dt, x: 17 + dt, y: 18 + dt });
    });
    setOtherUpdate(other, originalUpdate);

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    (
      other as Other & {
        update: (dt: number) => void;
      }
    ).update(2);

    expect(originalUpdate).toHaveBeenCalledWith(2);
    expect(lootlogOtherGlowManager.getGlowPosition("617")).toEqual({
      x: 19,
      y: 20,
    });
    expect(lootlogOtherGlowManager.getGlowOrder("617")).toBe(20.1);
  });

  it("restores runtime Other.update when managed glow is removed", () => {
    const other = createOther("617");
    const originalUpdate = vi.fn();
    setOtherUpdate(other, originalUpdate);

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);

    expect(
      (
        other as Other & {
          update: (dt: number) => void;
        }
      ).update,
    ).not.toBe(originalUpdate);

    lootlogOtherGlowManager.removeGlow("617");

    expect(
      (
        other as Other & {
          update: (dt: number) => void;
        }
      ).update,
    ).toBe(originalUpdate);
  });

  it("draws managed glow using the latest runtime other position", () => {
    const other = createOther("617");
    const drawImage = vi.fn();
    const context = {
      drawImage,
      fillRect: vi.fn(),
      fillStyle: "",
      globalCompositeOperation: "",
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context,
    );

    lootlogOtherGlowManager.install();
    lootlogOtherGlowManager.setGlow(other, LOOTLOG_OTHER_GLOW_BLUE);
    const glow = getRuntimeDrawableList()[1] as {
      draw: (ctx: CanvasRenderingContext2D) => void;
    };

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
  });

  it("suppresses native Margonem other glows while keeping other drawables and Lootlog glows", () => {
    const other = createOther("617");
    const nativeMaskGlow = {
      draw: vi.fn(),
      master: other,
      update: vi.fn(),
      updateColor: vi.fn(),
    };
    const nativeColorMark = {
      getColor: vi.fn(() => "green"),
      getTypeObject: vi.fn(() => "OTHER_NAVIGATE"),
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
