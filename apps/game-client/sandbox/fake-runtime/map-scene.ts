import type { GameEvent } from "@lootlog/margonem/game-events";
import type { createNiEngine } from "./ni-runtime";
import type { SandboxWorld } from "./world";

type NiEngine = ReturnType<typeof createNiEngine>;

/**
 * A small drawn map for features that paint on or around characters (the
 * faction war champion highlight). NI gets a canvas renderer with the game's
 * draw hook and tip event; SI gets a `#base` layer with `#other{id}` and
 * `#hero` elements carrying `tip` attributes. Characters glide to their tile
 * the way the game interpolates `rx`/`ry`, so effects can be seen following
 * them. Enabled with `?scene=map` (implied by `?faction-war=champions`).
 */

const TILE = 32;

const COLUMNS = 22;

const ROWS = 16;

const TILES_PER_SECOND = 4;

const DRAW_EVENT = "call_draw_add_to_renderer";

const TIP_EVENT = "afterCharacterTipUpdate";

type Drawable = {
  draw: (context: CanvasRenderingContext2D) => void;
  getOrder: () => number;
};

/** What NI hands AFTER_CHARACTER_TIP_UPDATE listeners; draw events carry nothing. */
type TipUpdate = { text: string; object: object | undefined };

type ApiCallback = (data?: TipUpdate) => void;

type Glide = { rx: number; ry: number };

type SceneCharacter = {
  id: string;
  nick: string;
  lvl: number;
  prof: string;
  x: number;
  y: number;
  hero: boolean;
};

type NiSceneWindow = Window & {
  API?: {
    addCallbackToEvent: (event: string, callback: ApiCallback) => void;
    removeCallbackFromEvent: (event: string, callback: ApiCallback) => void;
  };
};

type SiSceneWindow = Window & {
  g?: {
    tips?: {
      other?: (other: { nick?: string; lvl?: number; prof?: string }) => string;
    };
  };
};

export const isMapSceneRequested = () => {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("scene") === "map" || params.get("faction-war") === "champions"
  );
};

const listCharacters = (world: SandboxWorld): SceneCharacter[] => [
  {
    id: String(world.hero.id),
    nick: world.hero.nick,
    lvl: world.hero.lvl,
    prof: world.hero.prof,
    x: world.hero.x,
    y: world.hero.y,
    hero: true,
  },
  ...Object.values(world.others).map((other) => ({
    id: String(other.id),
    nick: other.nick ?? "?",
    lvl: other.lvl ?? 0,
    prof: other.prof ?? "",
    x: other.x ?? 0,
    y: other.y ?? 0,
    hero: false,
  })),
];

/** Moves each glide a frame's worth toward its tile, like Other.update. */
const advanceGlide = (glide: Glide, x: number, y: number, step: number) => {
  const approach = (from: number, to: number) =>
    Math.abs(to - from) <= step ? to : from + Math.sign(to - from) * step;

  glide.rx = approach(glide.rx, x);
  glide.ry = approach(glide.ry, y);
};

const createGlides = () => {
  const glides = new Map<string, Glide>();
  let last = performance.now();

  return {
    get: (character: SceneCharacter) => {
      let glide = glides.get(character.id);

      if (!glide) {
        glide = { rx: character.x, ry: character.y };
        glides.set(character.id, glide);
      }

      return glide;
    },
    step: () => {
      const now = performance.now();
      const step = ((now - last) / 1000) * TILES_PER_SECOND;
      last = now;

      return step;
    },
  };
};

const createTooltip = () => {
  const tooltip = document.createElement("div");
  tooltip.className = "sandbox-map-tip";
  document.body.append(tooltip);

  return {
    show: (html: string, clientX: number, clientY: number) => {
      tooltip.innerHTML = html;
      tooltip.style.display = "block";
      tooltip.style.transform = `translate(${clientX + 14}px, ${clientY + 14}px)`;
    },
    hide: () => {
      tooltip.style.display = "none";
    },
  };
};

const colorOf = (character: SceneCharacter) =>
  character.hero
    ? "#e8c46a"
    : `hsl(${(Number(character.id) * 47) % 360} 60% 60%)`;

const drawCharacter = (
  context: CanvasRenderingContext2D,
  character: SceneCharacter,
  glide: Glide,
) => {
  const centerX = glide.rx * TILE + TILE / 2;
  const feetY = glide.ry * TILE + TILE;

  context.fillStyle = "rgb(0 0 0 / 35%)";
  context.beginPath();
  context.ellipse(centerX, feetY - 3, 10, 4, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = colorOf(character);
  context.fillRect(centerX - 8, feetY - 40, 16, 34);
  context.beginPath();
  context.arc(centerX, feetY - 44, 7, 0, Math.PI * 2);
  context.fill();

  context.font = "bold 11px system-ui";
  context.textAlign = "center";
  context.fillStyle = "#fff";
  context.fillText(character.nick, centerX, feetY - 56);
};

export function installNiMapScene(world: SandboxWorld, engine: NiEngine): void {
  const runtimeWindow: NiSceneWindow = window;
  const listeners = new Map<string, Set<ApiCallback>>();
  let queue: Drawable[] = [];
  const glides = createGlides();

  const emit = (event: string, data?: TipUpdate) => {
    for (const callback of listeners.get(event) ?? []) callback(data);
  };

  runtimeWindow.API = {
    addCallbackToEvent: (event, callback) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
    },
    removeCallbackFromEvent: (event, callback) => {
      listeners.get(event)?.delete(callback);
    },
  };

  // The handles the adapters read (`Engine.hero`, `Engine.others.getById`)
  // receive `rx`/`ry` every frame, as the game's characters do.
  const getHandle = (character: SceneCharacter): object | undefined =>
    character.hero ? engine.hero : engine.others.getById(character.id);

  Object.assign(engine, {
    apiData: {
      CALL_DRAW_ADD_TO_RENDERER: DRAW_EVENT,
      AFTER_CHARACTER_TIP_UPDATE: TIP_EVENT,
    },
    renderer: {
      add: (...drawables: Drawable[]) => queue.push(...drawables),
      getHighestOrderWithoutSort: () => 20_007,
    },
  });
  Object.assign(engine.others, { otherTipRefresh: () => {} });

  const canvas = document.createElement("canvas");
  canvas.className = "sandbox-map-canvas";
  canvas.width = COLUMNS * TILE;
  canvas.height = ROWS * TILE;
  document.querySelector(".sandbox-game-canvas")?.replaceChildren(canvas);

  const context = canvas.getContext("2d");
  const tooltip = createTooltip();

  if (!context) return;

  const mapDrawable: Drawable = {
    getOrder: () => 0,
    draw: (target) => {
      target.fillStyle = "#24361f";
      target.fillRect(0, 0, canvas.width, canvas.height);
      target.strokeStyle = "rgb(255 255 255 / 5%)";

      for (let column = 0; column <= COLUMNS; column += 1) {
        target.beginPath();
        target.moveTo(column * TILE, 0);
        target.lineTo(column * TILE, canvas.height);
        target.stroke();
      }

      for (let row = 0; row <= ROWS; row += 1) {
        target.beginPath();
        target.moveTo(0, row * TILE);
        target.lineTo(canvas.width, row * TILE);
        target.stroke();
      }
    },
  };

  const frame = () => {
    const step = glides.step();
    queue = [mapDrawable];

    for (const character of listCharacters(world)) {
      const glide = glides.get(character);
      advanceGlide(glide, character.x, character.y, step);

      const handle = getHandle(character);

      if (handle) Object.assign(handle, { rx: glide.rx, ry: glide.ry });

      queue.push({
        getOrder: () => glide.ry + 0.4,
        draw: (target) => drawCharacter(target, character, glide),
      });
    }

    emit(DRAW_EVENT);
    queue.sort((left, right) => left.getOrder() - right.getOrder());
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const drawable of queue) drawable.draw(context);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  // NI builds the tip html when a character is hovered and hands it to
  // AFTER_CHARACTER_TIP_UPDATE listeners with the hovered object.
  canvas.addEventListener("mousemove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) * canvas.width) / bounds.width;
    const y = ((event.clientY - bounds.top) * canvas.height) / bounds.height;

    const hovered = listCharacters(world).find((character) => {
      const glide = glides.get(character);

      return (
        x >= glide.rx * TILE &&
        x <= glide.rx * TILE + TILE &&
        y >= glide.ry * TILE - 24 &&
        y <= glide.ry * TILE + TILE
      );
    });

    if (!hovered) {
      tooltip.hide();

      return;
    }

    const handle = getHandle(hovered);

    if (handle) {
      Object.assign(handle, {
        canvasObjectType: hovered.hero ? "HERO" : "OTHER",
      });
    }

    const tip = {
      text: `<div class="info-wrapper"><div class="nick">${hovered.nick} (${hovered.lvl}${hovered.prof})</div></div>`,
      object: handle,
    };

    emit(TIP_EVENT, tip);
    tooltip.show(tip.text, event.clientX, event.clientY);
  });
  canvas.addEventListener("mouseleave", tooltip.hide);
}

export function installSiMapScene(world: SandboxWorld): void {
  const runtimeWindow: SiSceneWindow = window;
  const glides = createGlides();
  const tooltip = createTooltip();
  let hovered: HTMLElement | null = null;

  const g = runtimeWindow.g;

  if (g) {
    g.tips = {
      other: (other) =>
        `<b>${other.nick ?? ""}</b>Lvl: ${other.lvl ?? ""}${other.prof ?? ""}`,
    };
  }

  const base = document.createElement("div");
  base.id = "base";
  base.className = "sandbox-si-base";
  document.querySelector(".sandbox-game-canvas")?.replaceChildren(base);

  const elements = new Map<string, HTMLDivElement>();

  const ensureElement = (character: SceneCharacter) => {
    const id = character.hero ? "hero" : `other${character.id}`;
    let element = elements.get(id);

    if (!element) {
      element = document.createElement("div");
      element.id = id;
      element.className = character.hero ? "sandbox-si-hero" : "other";
      element.style.background = colorOf(character);
      element.textContent = character.nick;
      base.append(element);
      elements.set(id, element);
    }

    // SI writes the tip from g.tips.other when an other is created or fully
    // updated; Lootlog rewrites it afterwards.
    if (!character.hero && !element.hasAttribute("tip")) {
      const other = world.others[character.id];

      element.setAttribute("tip", g?.tips?.other?.(other ?? {}) ?? "");
    }

    return element;
  };

  const frame = () => {
    const step = glides.step();
    const present = new Set<string>();

    for (const character of listCharacters(world)) {
      const glide = glides.get(character);
      advanceGlide(glide, character.x, character.y, step);

      const runtimeCharacter = character.hero
        ? world.hero
        : world.others[character.id];

      if (runtimeCharacter) {
        Object.assign(runtimeCharacter, { rx: glide.rx, ry: glide.ry });
      }

      const element = ensureElement(character);
      present.add(element.id);
      element.style.left = `${glide.rx * TILE}px`;
      element.style.top = `${glide.ry * TILE + TILE - 48}px`;
      element.style.zIndex = String(Math.round(glide.ry) * 2 + 10);
    }

    for (const [id, element] of elements) {
      if (present.has(id)) continue;

      element.remove();
      elements.delete(id);
    }

    if (hovered) {
      const tip = hovered.getAttribute("tip");

      if (tip)
        tooltip.show(tip, Number(hovered.dataset.x), Number(hovered.dataset.y));
    }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  // SI's Tip shows the hovered element's `tip` attribute and re-reads it
  // while the element stays hovered.
  base.addEventListener("mousemove", (event) => {
    const target =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>("[tip]")
        : null;

    hovered = target;

    if (!target) {
      tooltip.hide();

      return;
    }

    target.dataset.x = String(event.clientX);
    target.dataset.y = String(event.clientY);
  });
  base.addEventListener("mouseleave", () => {
    hovered = null;
    tooltip.hide();
  });
}

/**
 * SI's newOther rewrites an other's `tip` from g.tips.other on every packet
 * that carries its level, dropping what Lootlog added; the scene does the
 * same, synchronously, before Lootlog sees the packet.
 */
export function rewriteSiOtherTips(
  world: SandboxWorld,
  others: NonNullable<GameEvent["other"]>,
): void {
  const runtimeWindow: SiSceneWindow = window;
  const buildTip = runtimeWindow.g?.tips?.other;

  for (const [id, patch] of Object.entries(others)) {
    const other = world.others[id];

    if (!("lvl" in patch) || !other || !buildTip) continue;

    document.getElementById(`other${id}`)?.setAttribute("tip", buildTip(other));
  }
}
