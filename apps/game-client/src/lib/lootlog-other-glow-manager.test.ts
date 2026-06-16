import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
  lootlogOtherGlowManager,
} from "./lootlog-other-glow-manager";

const originalWindowEngine = window.Engine;

function getRuntimeDrawableList(): unknown[] {
  return (
    window.Engine as unknown as {
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
