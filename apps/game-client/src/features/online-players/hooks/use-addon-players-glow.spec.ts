import { describe, expect, it, vi } from "vitest";
import {
  ensureWhoIsHereLootlogBadgeStyle,
  refreshWhoIsHereTipViewsForOther,
  removeWhoIsHereLootlogBadgeStyle,
  syncWhoIsHereLootlogMarkerForOther,
} from "./use-addon-players-glow";

describe("refreshWhoIsHereTipViewsForOther", () => {
  it("refreshes whoIsHere and minimap tips when engine objects are available", () => {
    const tipContainer = {
      0: document.createElement("div"),
      length: 1,
      tip: vi.fn(),
    };
    const find = vi.fn().mockReturnValue(tipContainer);
    const createTipWrapper = vi.fn();
    const getWhoIsHereOther = vi.fn().mockReturnValue({
      $: {
        find,
      },
    });

    const miniMapObject = { id: "7" };
    const getObject = vi.fn().mockReturnValue(miniMapObject);
    const createTipToOther = vi.fn();
    const getMiniMapOtherController = vi.fn().mockReturnValue({
      getObject,
      createTipToOther,
    });
    const tipUpdate = vi.fn();
    const createStrTip = vi.fn().mockReturnValue("<div>tip</div>");
    const getImg = vi.fn().mockReturnValue("avatar.gif");
    const getById = vi.fn().mockReturnValue({
      tipUpdate,
      createStrTip,
      getImg,
    });

    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
        createTipWrapper,
      },
      others: {
        getById,
      },
      miniMapController: {
        handHeldMiniMapController: {
          getMiniMapOtherController,
        },
      },
    };
    const other = {
      d: {
        id: 7,
      },
    };

    refreshWhoIsHereTipViewsForOther(other, "runtime-7", engine);

    expect(getWhoIsHereOther).toHaveBeenCalledWith("runtime-7");
    expect(find).toHaveBeenCalledWith(".tip-container");
    expect(getById).toHaveBeenCalledWith("runtime-7");
    expect(tipUpdate).toHaveBeenCalledTimes(1);
    expect(createTipWrapper).toHaveBeenCalledWith(
      tipContainer,
      expect.objectContaining({
        tipUpdate,
        createStrTip,
        getImg,
      }),
    );
    expect(getMiniMapOtherController).toHaveBeenCalledTimes(1);
    expect(getObject).toHaveBeenCalledWith("runtime-7");
    expect(createTipToOther).toHaveBeenCalledWith(miniMapObject);
  });

  it("does not throw when whoIsHere/minimap structures are missing", () => {
    const getWhoIsHereOther = vi.fn();
    const getMiniMapOtherController = vi.fn();

    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
      },
      miniMapController: {
        handHeldMiniMapController: {
          getMiniMapOtherController,
        },
      },
    };
    const other = {
      d: {},
    };

    expect(() =>
      refreshWhoIsHereTipViewsForOther(other, undefined, engine),
    ).not.toThrow();
    expect(getWhoIsHereOther).not.toHaveBeenCalled();
    expect(getMiniMapOtherController).not.toHaveBeenCalled();
  });

  it("skips whoIsHere tip wrapper when candidate lacks createStrTip/getImg", () => {
    const tipContainer = {
      0: document.createElement("div"),
      length: 1,
      tip: vi.fn(),
    };
    const find = vi.fn().mockReturnValue(tipContainer);
    const createTipWrapper = vi.fn();
    const getWhoIsHereOther = vi.fn().mockReturnValue({
      $: {
        find,
      },
    });

    const miniMapObject = { id: "runtime-9" };
    const getObject = vi.fn().mockReturnValue(miniMapObject);
    const createTipToOther = vi.fn();
    const getMiniMapOtherController = vi.fn().mockReturnValue({
      getObject,
      createTipToOther,
    });
    const getById = vi.fn().mockReturnValue({
      tip: ["broken"],
    });

    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
        createTipWrapper,
      },
      others: {
        getById,
      },
      miniMapController: {
        handHeldMiniMapController: {
          getMiniMapOtherController,
        },
      },
    };
    const other = {
      d: {
        id: 9,
      },
      tip: ["not-a-function"],
    };

    expect(() =>
      refreshWhoIsHereTipViewsForOther(other, "runtime-9", engine),
    ).not.toThrow();
    expect(createTipWrapper).not.toHaveBeenCalled();
    expect(createTipToOther).toHaveBeenCalledWith(miniMapObject);
  });
});

describe("syncWhoIsHereLootlogMarkerForOther", () => {
  it("adds class when player uses lootlog", () => {
    const addClass = vi.fn();
    const removeClass = vi.fn();
    const getWhoIsHereOther = vi.fn().mockReturnValue({
      $: {
        addClass,
        removeClass,
      },
    });
    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
      },
    };

    syncWhoIsHereLootlogMarkerForOther(
      { d: { id: 11 } },
      "runtime-11",
      true,
      engine,
    );

    expect(getWhoIsHereOther).toHaveBeenCalledWith("runtime-11");
    expect(addClass).toHaveBeenCalledWith("ll-whoishere-has-lootlog");
    expect(removeClass).not.toHaveBeenCalled();
  });

  it("removes class when player does not use lootlog", () => {
    const addClass = vi.fn();
    const removeClass = vi.fn();
    const getWhoIsHereOther = vi.fn().mockReturnValue({
      $: {
        addClass,
        removeClass,
      },
    });
    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
      },
    };

    syncWhoIsHereLootlogMarkerForOther(
      { d: { id: 12 } },
      "runtime-12",
      false,
      engine,
    );

    expect(removeClass).toHaveBeenCalledWith("ll-whoishere-has-lootlog");
    expect(addClass).not.toHaveBeenCalled();
  });

  it("does nothing when whoIsHere entry is missing", () => {
    const getWhoIsHereOther = vi.fn().mockReturnValue(undefined);
    const engine = {
      whoIsHere: {
        getWhoIsHereOther,
      },
    };

    expect(() =>
      syncWhoIsHereLootlogMarkerForOther(
        { d: { id: 13 } },
        "runtime-13",
        true,
        engine,
      ),
    ).not.toThrow();
    expect(getWhoIsHereOther).toHaveBeenCalled();
  });
});

describe("whoIsHere lootlog badge style", () => {
  it("injects style only once and can remove it", () => {
    removeWhoIsHereLootlogBadgeStyle();

    ensureWhoIsHereLootlogBadgeStyle();
    ensureWhoIsHereLootlogBadgeStyle();

    const styles = document.querySelectorAll("#ll-whoishere-lootlog-style");
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toContain("ll-whoishere-has-lootlog");
    expect(styles[0].textContent).toContain('content:"LL"');

    removeWhoIsHereLootlogBadgeStyle();
    expect(
      document.querySelector("#ll-whoishere-lootlog-style"),
    ).toBeNull();
  });
});
