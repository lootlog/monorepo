import { parseBattleMoves } from "@lootlog/battle-processor/battle-log";
import {
  buildReplayTimeline,
  REPLAY_IMPACT_FRACTION,
} from "@lootlog/battle-processor/replay-timeline";
import { describe, expect, it, vi } from "vitest";
import { getBattlegroundUrl, getReplaySpriteUrl } from "./replay-asset-loader";
import type { ReplayRenderLabels } from "./replay-canvas-types";
import { buildExportFilename } from "./replay-export-types";
import { renderFrame } from "./replay-renderer";

const TEST_LABELS: ReplayRenderLabels = {
  turn: "TURA {{current}}/{{total}}",
  evade: "UNIK",
  block: "BLOK",
  parry: "PAROWANIE",
  arrowBlock: "BLOK STRZAŁY",
  pierce: "PRZEBICIE",
  crit: "KRYTYK",
  flee: "UCIECZKA",
  mvp: "MVP walki",
  totalTurns: "Liczba tur",
  damageDealt: "Obrażenia",
  yourTeam: "Twoja drużyna",
  enemyTeam: "Przeciwnicy",
  watermark: "lootlog.pl",
  outcomes: {
    victory: "Zwycięstwo",
    defeat: "Porażka",
    draw: "Remis",
    flee: "Ucieczka",
    unfinished: "Niedokończona",
  },
  legendary: {
    anguish: "Krwawa udręka",
    cleanse: "Płomienne oczyszczenie",
    critShield: "Krytyczna osłona",
    curse: "Klątwa",
    facade: "Fasada opieki",
    frenzy: "Eskalacja szału",
    glare: "Oślepienie",
    holyTouch: "Dotyk anioła",
    lastHeal: "Ostatni ratunek",
    puncture: "Przeszywająca skuteczność",
    retaliation: "Aura odwetu",
    unknown: "Bonus legendarny",
    veryCrit: "Cios bardzo krytyczny",
  },
};

const createFakeCanvasContext = (width: number, height: number) => {
  const fillTextCalls: string[] = [];
  const gradient: CanvasGradient = { addColorStop: vi.fn() };
  const canvasStub: Partial<HTMLCanvasElement> = { width, height };

  const stub: Partial<CanvasRenderingContext2D> = {
    // SAFETY: Partial HTMLCanvasElement supplies width and height read by renderFrame in unit tests.
    canvas: canvasStub as HTMLCanvasElement,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    filter: "none",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    save: vi.fn(),
    setTransform: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    setLineDash: vi.fn(),
    drawImage: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn((text: string) => {
      fillTextCalls.push(text);
    }),
    measureText: vi.fn((text: string) => {
      const metrics: Partial<TextMetrics> = { width: text.length * 10 };

      // SAFETY: Partial TextMetrics stub provides width used by HUD and banner layout in tests.
      return metrics as TextMetrics;
    }),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
  };

  // SAFETY: Partial CanvasRenderingContext2D stub implements every method invoked by renderFrame in happy-dom.
  return { ctx: stub as CanvasRenderingContext2D, fillTextCalls };
};

const EMPTY_ASSETS = { sprites: new Map(), battleground: null };

describe("battle replay helpers and renderer", () => {
  it("loads outfits straight from the Margonem CDN and rejects path traversal", () => {
    expect(getReplaySpriteUrl("/vip/12345.gif")).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/postacie/vip/12345.gif",
    );
    expect(getReplaySpriteUrl("../evil.gif")).toBeNull();
    expect(getReplaySpriteUrl("")).toBeNull();
  });

  it("resolves the battleground the game sent the way the game client does, falling back for missing or unsafe names", () => {
    expect(getBattlegroundUrl("034.jpg")).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/battle/m1.jpg",
    );
    expect(getBattlegroundUrl("m8.jpg")).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/battle/m8.jpg",
    );
    expect(getBattlegroundUrl(undefined)).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/battle/m18.jpg",
    );
    expect(getBattlegroundUrl("matchmaking.jpg")).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/battle/m18.jpg",
    );
    expect(getBattlegroundUrl("../secret.jpg")).toBe(
      "https://micc.garmory-cdn.cloud/obrazki/battle/m18.jpg",
    );
  });

  it("formats export filenames by battle id, layout, and extension", () => {
    expect(buildExportFilename("01a1067f-44e4-7000", "16:9", "mp4")).toBe(
      "lootlog-replay-01a1067f-44e-clip.mp4",
    );
    expect(buildExportFilename("01a1067f-44e4-7000", "9:16", "gif")).toBe(
      "lootlog-replay-01a1067f-44e-shorts.gif",
    );
  });

  it("shows each damage element of a mixed hit as its own number", () => {
    const timeline = buildReplayTimeline({
      characterId: "1",
      warriors: [
        {
          originalId: "1",
          name: "Wojownik",
          lvl: 190,
          prof: "w",
          icon: "/w.gif",
          team: 1,
        },
        {
          originalId: "2",
          name: "Mag",
          lvl: 190,
          prof: "m",
          icon: "/m.gif",
          team: 2,
        },
      ],
      moves: parseBattleMoves([
        {
          ev: 1000,
          f: { m: ["1=100;2=80;+dmg=700;+dmgf=350;-dmg=600;-dmgf=250"] },
        },
      ]),
    });

    const attack = timeline.events.find((event) => event.kind === "attack");

    const impactMs =
      (attack?.tStart ?? 0) +
      ((attack?.tEnd ?? 0) - (attack?.tStart ?? 0)) * REPLAY_IMPACT_FRACTION;

    const frame = createFakeCanvasContext(1280, 720);

    renderFrame(frame.ctx, timeline, impactMs + 60, "16:9", {
      assets: EMPTY_ASSETS,
      labels: TEST_LABELS,
    });

    expect(frame.fillTextCalls).toEqual(
      expect.arrayContaining(["600", "+250"]),
    );
  });

  it("shows the hit, its damage and both fighters at impact, then the outcome and an MVP card that stays on the last frame", () => {
    const timeline = buildReplayTimeline({
      characterId: "1",
      warriors: [
        {
          originalId: "1",
          name: "Wojownik",
          lvl: 190,
          prof: "w",
          icon: "/w.gif",
          team: 1,
        },
        {
          originalId: "2",
          name: "Mag",
          lvl: 190,
          prof: "m",
          icon: "/m.gif",
          team: 2,
        },
      ],
      moves: parseBattleMoves([
        {
          ev: 1000,
          f: {
            m: [
              "1=100;2=40;+dmg=9500;+verycrit;-dmg=8100;+legbon_verycrit",
              "1=100;2=0;+dmg=7200;-dmg=6800;winner=Wojownik",
            ],
          },
        },
      ]),
      world: "luvia",
      battleType: "1v1",
      winner: "Wojownik",
      winningTeam: 1,
    });

    const firstAttack = timeline.events.find(
      (event) => event.kind === "attack",
    );

    expect(firstAttack).toBeDefined();

    const impactMs =
      (firstAttack?.tStart ?? 0) +
      ((firstAttack?.tEnd ?? 0) - (firstAttack?.tStart ?? 0)) *
        REPLAY_IMPACT_FRACTION;

    const landscape = createFakeCanvasContext(1280, 720);

    renderFrame(landscape.ctx, timeline, impactMs + 60, "16:9", {
      assets: EMPTY_ASSETS,
      labels: TEST_LABELS,
    });

    expect(landscape.fillTextCalls).toEqual(
      expect.arrayContaining([
        "lootlog.pl",
        "TURA 1/2",
        "Wojownik",
        "Mag",
        "190w",
        "KRYTYK",
      ]),
    );
    expect(
      landscape.fillTextCalls.some((text) => /^8\s?100$/u.test(text)),
    ).toBe(true);

    const outroStart = createFakeCanvasContext(1080, 1920);

    renderFrame(
      outroStart.ctx,
      timeline,
      timeline.actionDurationMs + 300,
      "9:16",
      { assets: EMPTY_ASSETS, labels: TEST_LABELS },
    );

    expect(outroStart.fillTextCalls).toContain("Zwycięstwo");

    const lastFrame = createFakeCanvasContext(1080, 1920);

    renderFrame(lastFrame.ctx, timeline, timeline.totalDurationMs, "9:16", {
      assets: EMPTY_ASSETS,
      labels: TEST_LABELS,
    });

    expect(lastFrame.fillTextCalls).toEqual(
      expect.arrayContaining([
        "Zwycięstwo · Liczba tur: 2",
        "MVP walki: Wojownik",
      ]),
    );
  });
});
