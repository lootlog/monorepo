import type { SVGProps } from "react";

/**
 * 16×16 pixel sprites in the style of Margonem's own art. `#` is a solid
 * pixel and `+` a half-tone one; both take `currentColor`, so the icon follows
 * the surrounding text color. Render at 16px multiples to keep pixels sharp.
 */
const SPRITES = {
  ELITE2: [
    "..............##",
    ".............#+#",
    "............#+#.",
    "...........#+#..",
    "..........#+#...",
    ".........#+#....",
    "........#+#.....",
    "....#..#+#......",
    ".....##+#.......",
    "......##........",
    ".....+.#........",
    "....+...#.......",
    "..##............",
    "..##............",
    "................",
    "................",
  ],
  HERO: [
    "................",
    ".##############.",
    ".#+++++##+++++#.",
    ".#+++++##+++++#.",
    ".#+++++##+++++#.",
    ".##############.",
    ".#+++++##+++++#.",
    ".#+++++##+++++#.",
    ".#+++++##+++++#.",
    "..#++++##++++#..",
    "..#++++##++++#..",
    "...#+++##+++#...",
    "....#++##++#....",
    ".....#+##+#.....",
    "......####......",
    ".......##.......",
  ],
  COLOSSUS: [
    "+..............+",
    "++............++",
    ".++..######..++.",
    ".+++########+++.",
    "..############..",
    ".##############.",
    ".##..######..##.",
    ".#....####....#.",
    ".#....####....#.",
    ".##..######..##.",
    "..#####..#####..",
    "...####..####...",
    "...##########...",
    "...#.#.##.#.#...",
    "...##########...",
    "....########....",
  ],
  TITAN: [
    "................",
    ".+.....++.....+.",
    ".#.....##.....#.",
    ".##...####...##.",
    ".###..####..###.",
    ".####.####.####.",
    ".##############.",
    ".##############.",
    ".###++####++###.",
    ".###++####++###.",
    ".##############.",
    "................",
    ".++++++++++++++.",
    ".##############.",
    "................",
    "................",
  ],
  OTHER: [
    "....########....",
    "...##########...",
    "..############..",
    ".##############.",
    ".##############.",
    ".###..####..###.",
    ".##....##....##.",
    ".##....##....##.",
    ".###..####..###.",
    "..#####..#####..",
    "...####..####...",
    "....########....",
    "....#.#..#.#....",
    "....########....",
    ".....######.....",
    "................",
  ],
} as const;

export type NpcTypeIconType = keyof typeof SPRITES;

type Run = { x: number; y: number; width: number; tone: "#" | "+" };

// Horizontal runs keep each sprite to a few dozen rects.
const toRuns = (rows: ReadonlyArray<string>): Run[] =>
  rows.flatMap((row, y) => {
    const runs: Run[] = [];

    for (let x = 0; x < row.length; x += 1) {
      const tone = row[x];

      if (tone !== "#" && tone !== "+") continue;

      const previous = runs[runs.length - 1];

      if (
        previous &&
        previous.tone === tone &&
        previous.x + previous.width === x
      )
        previous.width += 1;
      else runs.push({ x, y, width: 1, tone });
    }

    return runs;
  });

type NpcTypeIconProps = Omit<SVGProps<SVGSVGElement>, "type"> & {
  type: NpcTypeIconType;
};

/** Pixel-art mark for an NPC group: Elita II, Heros, Kolos, Tytan or others. */
export function NpcTypeIcon({ type, ...props }: NpcTypeIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden
      {...props}
    >
      {toRuns(SPRITES[type]).map(({ x, y, width, tone }) => (
        <rect
          key={`${x}:${y}`}
          x={x}
          y={y}
          width={width}
          height={1}
          opacity={tone === "+" ? 0.5 : undefined}
        />
      ))}
    </svg>
  );
}
