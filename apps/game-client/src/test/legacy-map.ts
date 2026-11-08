import { vi } from "vitest";

/** A sprite sheet of 4×4 character frames, as SI loads it. */
export type LegacySprite = { url: string; width: number; height: number };

/**
 * Lets the DOM decode sprites: SI loads every sprite into a blob url before
 * showing it, so `<img>` with that url is complete at once in the browser.
 */
export function installLegacySprites(sprites: readonly LegacySprite[]): void {
  const byUrl = new Map(sprites.map((sprite) => [sprite.url, sprite]));
  const spriteOf = (image: HTMLImageElement) => byUrl.get(image.src);

  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockImplementation(
    function (this: HTMLImageElement) {
      return spriteOf(this) !== undefined;
    },
  );
  vi.spyOn(
    HTMLImageElement.prototype,
    "naturalWidth",
    "get",
  ).mockImplementation(function (this: HTMLImageElement) {
    return spriteOf(this)?.width ?? 0;
  });
  vi.spyOn(
    HTMLImageElement.prototype,
    "naturalHeight",
    "get",
  ).mockImplementation(function (this: HTMLImageElement) {
    return spriteOf(this)?.height ?? 0;
  });
}

/**
 * Styles a character element the way SI's `moveOther` (elements.js) and
 * `hero.run` (player.js) do, with jQuery's px units.
 */
export function placeLegacyCharacter(
  element: HTMLElement,
  { sprite, rx, ry, step = 0, dir = 0, water = 0 }: LegacyPlacement,
): void {
  const fw = sprite.width / 4;
  const fh = sprite.height / 4;
  const deep = water / 4 > 8;

  Object.assign(element.style, {
    backgroundImage: `url("${sprite.url}")`,
    width: `${fw}px`,
    left: `${rx * 32 + 16 - (fw >> 1)}px`,
    top: `${ry * 32 + 32 - fh + (deep ? 0 : water)}px`,
    height: `${fh - (deep ? water - 32 : water)}px`,
    zIndex: String(ry * 2 + 10),
    backgroundPosition: `${step * fw}px ${-dir * fh}px`,
  });
}

export type LegacyPlacement = {
  sprite: LegacySprite;
  rx: number;
  ry: number;
  step?: number;
  dir?: number;
  water?: number;
};

/**
 * SI's map: `#base` with the elements of the hero and others, and the game's
 * other records, as `newOther` (elements.js) keeps them.
 */
export function installLegacyMap() {
  const base = document.createElement("div");
  base.id = "base";
  document.body.append(base);
  const others: Record<string, { id: string; account: number }> = {};
  vi.stubGlobal("Engine", undefined);
  vi.stubGlobal("g", { other: others });

  return {
    base,
    addHero(placement: LegacyPlacement): HTMLElement {
      const element = document.createElement("div");
      element.id = "hero";
      base.append(element);
      placeLegacyCharacter(element, placement);

      return element;
    },
    addOther(id: string, placement: LegacyPlacement): HTMLElement {
      const element = document.createElement("div");
      element.className = "other";
      element.id = `other${id}`;
      base.append(element);
      placeLegacyCharacter(element, placement);
      others[id] = { id, account: 7 };

      return element;
    },
    /** A `del` packet: the data and the element go. */
    removeOther(id: string): void {
      delete others[id];
      document.getElementById(`other${id}`)?.remove();
    },
    dispose(): void {
      base.remove();
    },
  };
}
