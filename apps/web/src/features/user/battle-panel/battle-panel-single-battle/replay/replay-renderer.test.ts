import { parseBattleMoves } from "@lootlog/battle-processor/battle-log";
import { buildReplayTimeline } from "@lootlog/battle-processor/replay-timeline";
import { describe, expect, it, vi } from "vitest";
import { getReplaySoundTriggerMs } from "./replay-audio";
import type { ReplayRenderLabels } from "./replay-canvas-types";
import { buildExportFilename } from "./replay-export-types";
import { renderFrame } from "./replay-renderer";
import { getReplaySpriteUrl } from "./replay-sprite-loader";

const TEST_LABELS: ReplayRenderLabels = {
  turnCounter: "TURA {{current}} / {{total}}",
  evade: "UNIK",
  block: "BLOK",
  parry: "PAROWANIE",
  arrowBlock: "BLOK STRZAŁY",
  pierce: "PRZEBICIE",
  counter: "KONTRA",
  flee: "UCIECZKA",
  mvp: "MVP",
  totalTurns: "Liczba tur",
  damageShort: "obr.",
  watermark: "lootlog.pl",
  logStart: "Walka rozpoczęta",
  stepLog: "podchodzi bliżej",
  diedLog: "poległ!",
  effectLog: "efekt",
  shieldLog: "absorpcji",
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
    save: vi.fn(),
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

describe("battle replay helpers and renderer", () => {
  it("normalizes Margonem outfit URLs onto the same-origin CORS sprite proxy", () => {
    expect(getReplaySpriteUrl("/vip/12345.gif")).toBe(
      "/cdn-proxy/obrazki/postacie/vip/12345.gif",
    );
    expect(
      getReplaySpriteUrl(
        "https://micc.garmory-cdn.cloud/obrazki/postacie/m/pal.gif",
      ),
    ).toBe("/cdn-proxy/obrazki/postacie/m/pal.gif");
    expect(getReplaySpriteUrl("/npc/her/boss.gif")).toBe(
      "/cdn-proxy/obrazki/npc/her/boss.gif",
    );
    expect(getReplaySpriteUrl("../evil.gif")).toBeNull();
    expect(getReplaySpriteUrl("")).toBeNull();
  });

  it("formats export filenames by battle id, layout, and extension", () => {
    expect(buildExportFilename("01a1067f-44e4-7000", "16:9", "mp4")).toBe(
      "lootlog-replay-01a1067f-44e-clip.mp4",
    );
    expect(buildExportFilename("01a1067f-44e4-7000", "9:16", "gif")).toBe(
      "lootlog-replay-01a1067f-44e-shorts.gif",
    );
  });

  it("renders combat frames and victory outro deterministically for 16:9 and 9:16 layouts", () => {
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

    const landscape = createFakeCanvasContext(1280, 720);

    renderFrame(landscape.ctx, timeline, 650, "16:9", {
      sprites: new Map(),
      labels: TEST_LABELS,
    });

    expect(landscape.fillTextCalls).toContain("lootlog.pl");
    expect(landscape.fillTextCalls).toContain("#1");
    expect(
      landscape.fillTextCalls.some((text) => text.includes("Wojownik [190w]")),
    ).toBe(true);
    expect(
      landscape.fillTextCalls.some((text) => text.includes("-8 100!")),
    ).toBe(true);

    const firstAttack = timeline.events.find(
      (event) => event.kind === "attack",
    );

    expect(firstAttack).toBeDefined();

    const attackTriggerMs = firstAttack
      ? getReplaySoundTriggerMs(firstAttack)
      : -1;

    expect(attackTriggerMs).toBeGreaterThan(firstAttack?.tStart ?? 0);
    expect(attackTriggerMs).toBeLessThan(firstAttack?.tEnd ?? 0);

    const verticalOutro = createFakeCanvasContext(1080, 1920);

    renderFrame(
      verticalOutro.ctx,
      timeline,
      timeline.actionDurationMs + 900,
      "9:16",
      {
        sprites: new Map(),
        labels: TEST_LABELS,
      },
    );

    expect(verticalOutro.fillTextCalls).toContain("ZWYCIĘSTWO");
    expect(verticalOutro.fillTextCalls).toContain("Wojownik");
  });
});
