import {
  formatLootDrawTickets,
  lootDrawLandingOffset,
  lootDrawTicketShare,
} from "@lootlog/domain/loot-draw";
import { formatDecimal } from "@lootlog/domain/locale";
import { itemIconUrl } from "@lootlog/domain/margonem-cdn";
import { formatLevel } from "@lootlog/domain/profession";
import type { LootDrawResolvedNotificationEvent } from "@lootlog/schema/notifications";
import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import sharp from "sharp";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";

const WIDTH = 1400;

const HEIGHT = 630;

const FONT = "DejaVu Sans, Arial, sans-serif";

const BACKGROUND = "#10141C";

const TEXT = "#F2F4F8";

const MUTED = "#8A93A6";

const FAINT = "#6F7A90";

const GOLD = "#F5C04A";

const LEGENDARY = "#FF9A3D";

const RED = "#E8697D";

const VOIDED_SLICE = "#2A303C";

/** Distinct on a dark ground; past ten, slices repeat a colour. */
const SLICE_COLORS = [
  "#F5C04A",
  "#5BA8FF",
  "#E8697D",
  "#4CC9A0",
  "#A88BFA",
  "#F08C4A",
  "#4FC3D9",
  "#D97ACB",
  "#9BCB5C",
  "#C9A57A",
];

const WHEEL = { cx: 290, cy: 315, radius: 215 };

/** Where the text column beside the wheel starts and ends. */
const COLUMN = { left: 590, right: WIDTH - 80 };

const ITEM_NAME = { x: 696, size: 30, wrappedSize: 26 };

/** The winner's slice stands out of the wheel by this much. */
const WINNER_OFFSET = 16;

const HUB_RADIUS = 40;

/**
 * Nicks run along their slice from the hub outwards; a slice narrower than
 * `minDegrees` has no room for one.
 */
const SLICE_LABEL = {
  size: 17,
  minDegrees: 9,
  inner: HUB_RADIUS + 14,
  outer: 16,
};

const LISTED_ENTRANTS = 5;

const ICON_FETCH_TIMEOUT_MS = 2_000;

const MAX_ICON_BYTES = 200_000;

const sliceColor = (index: number) =>
  SLICE_COLORS[index % SLICE_COLORS.length] ?? GOLD;

const escapeSvg = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );

/**
 * A generous guess at a glyph's advance in DejaVu Sans Bold, the card's font
 * in production, in ems. SVG text does not wrap or clip itself, so the card
 * measures its text to keep it inside the column.
 */
const GLYPH_WIDTHS: ReadonlyArray<readonly [string, number]> = [
  [" ", 0.35],
  ["iljIł.,:;'!|", 0.4],
  ["frt()[]-", 0.5],
  ["mwMW", 1.05],
];

const glyphWidth = (character: string) =>
  GLYPH_WIDTHS.find(([characters]) => characters.includes(character))?.[1] ??
  (character === character.toLowerCase() ? 0.72 : 0.8);

const textWidth = (body: string, size: number, letterSpacing = 0) =>
  [...body].reduce(
    (width, character) => width + glyphWidth(character) * size + letterSpacing,
    0,
  );

/** The text as it fits in `maxWidth`, cut short with an ellipsis if not. */
const fit = (
  body: string,
  size: number,
  maxWidth: number,
  letterSpacing = 0,
) => {
  if (textWidth(body, size, letterSpacing) <= maxWidth) return body;

  const characters = [...body];
  const cut = () => `${characters.join("").trimEnd()}…`;

  while (
    characters.length > 0 &&
    textWidth(cut(), size, letterSpacing) > maxWidth
  ) {
    characters.pop();
  }

  return cut();
};

/** The text broken at spaces into at most `maxLines`, the last cut short. */
const wrap = (
  body: string,
  size: number,
  maxWidth: number,
  maxLines: number,
) => {
  const lines: string[] = [];

  for (const word of body.split(" ")) {
    const last = lines.at(-1);

    if (last !== undefined && textWidth(`${last} ${word}`, size) <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else if (word) {
      lines.push(word);
    }
  }

  return [
    ...lines.slice(0, maxLines - 1),
    lines.slice(maxLines - 1).join(" "),
  ].flatMap((line) => (line ? [fit(line, size, maxWidth)] : []));
};

const text = (
  x: number,
  y: number,
  size: number,
  weight: number,
  fill: string,
  body: string,
  extra = "",
) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${body}</text>`;

const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;

  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
};

const slicePath = (
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
) => {
  // A single entrant fills the wheel, which one arc cannot draw.
  if (to - from >= 360) {
    return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${2 * radius} 0 a ${radius} ${radius} 0 1 0 ${-2 * radius} 0`;
  }

  const [x1, y1] = polar(cx, cy, radius, from);
  const [x2, y2] = polar(cx, cy, radius, to);

  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
};

/**
 * The wheel at rest, each entrant's tickets side by side, turned so the
 * pointer at the top stops inside the winner's slice.
 */
const wheelSvg = (draw: LootDrawResolvedNotificationEvent["draw"]) => {
  const voided = draw.voided !== null;
  const total = draw.entrants.reduce((sum, { tickets }) => sum + tickets, 0);
  let start = 0;

  const slices = draw.entrants.map(({ tickets }, index) => {
    const from = start;
    start += (tickets / total) * 360;

    return { index, from, to: start };
  });

  const winner = slices[draw.winnerIndex];

  // The pointer stops where the draw's wheel on the web stops in its slice.
  const turn = winner
    ? -90 -
      (winner.from + (winner.to - winner.from) * lootDrawLandingOffset(draw.id))
    : 0;

  const drawnSlices = slices.map(({ index, from, to }) => {
    const isWinner = index === draw.winnerIndex;
    const middle = turn + (from + to) / 2;

    const [dx = 0, dy = 0] = isWinner
      ? polar(0, 0, WINNER_OFFSET, middle)
      : [0, 0];

    const cx = WHEEL.cx + dx;
    const cy = WHEEL.cy + dy;
    const radius = isWinner ? WHEEL.radius + 6 : WHEEL.radius;

    const fill = voided ? VOIDED_SLICE : sliceColor(index);
    const opacity = voided || isWinner ? "" : 'fill-opacity="0.85"';

    const path = `<path d="${slicePath(cx, cy, radius, turn + from, turn + to)}" fill="${fill}" stroke="${BACKGROUND}" stroke-width="4" ${opacity}/>`;

    const name = draw.entrants[index]?.name ?? "";

    if (to - from < SLICE_LABEL.minDegrees || !name) return { path, label: "" };

    const inner = SLICE_LABEL.inner;
    const outer = radius - SLICE_LABEL.outer;
    // A name on the left half turns over so it never reads upside down.
    const flipped = Math.cos((middle * Math.PI) / 180) < 0;
    const [x, y] = polar(cx, cy, (inner + outer) / 2, middle);

    const label = text(
      0,
      0,
      SLICE_LABEL.size,
      800,
      voided ? MUTED : TEXT,
      escapeSvg(fit(name, SLICE_LABEL.size, outer - inner)),
      // A dark outline keeps white names legible on the light slices.
      `stroke="${BACKGROUND}" stroke-width="3" stroke-opacity="0.6" stroke-linejoin="round" paint-order="stroke" text-anchor="middle" dy="0.35em" transform="translate(${x} ${y}) rotate(${flipped ? middle + 180 : middle})"`,
    );

    return { path, label };
  });

  const top = WHEEL.cy - WHEEL.radius;

  return `${drawnSlices.map(({ path }) => path).join("")}
    ${drawnSlices.map(({ label }) => label).join("")}
    <circle cx="${WHEEL.cx}" cy="${WHEEL.cy}" r="${HUB_RADIUS}" fill="${BACKGROUND}"/>
    <path d="M ${WHEEL.cx - 18} ${top - 40} L ${WHEEL.cx + 18} ${top - 40} L ${WHEEL.cx} ${top - 8} Z" fill="${TEXT}"/>`;
};

const entrantListSvg = (draw: LootDrawResolvedNotificationEvent["draw"]) => {
  const others = draw.entrants
    .map((entrant, index) => ({ entrant, index }))
    .filter(({ index }) => index !== draw.winnerIndex)
    .toSorted((left, right) => right.entrant.tickets - left.entrant.tickets);

  const shown = others.slice(
    0,
    others.length > LISTED_ENTRANTS ? LISTED_ENTRANTS - 1 : LISTED_ENTRANTS,
  );

  const hidden = others.length - shown.length;
  const top = 390;

  const rows = shown
    .map(({ entrant, index }, row) => {
      const y = top + 30 + row * 28;

      return `<rect x="${COLUMN.left}" y="${y - 12}" width="12" height="12" rx="3" fill="${sliceColor(index)}"/>
        ${text(612, y, 17, 700, "#DCE3F0", escapeSvg(fit(entrant.name, 17, COLUMN.right - 612 - 120)))}
        ${text(COLUMN.right, y, 16, 700, MUTED, formatLootDrawTickets(entrant.tickets), 'text-anchor="end"')}`;
    })
    .join("");

  return `${text(COLUMN.left, top, 13, 800, FAINT, `POZOSTALI (${others.length})`, 'letter-spacing="2"')}
    ${rows}
    ${hidden > 0 ? text(612, top + 30 + shown.length * 28, 16, 700, FAINT, `i ${hidden} więcej`) : ""}`;
};

const voidedSvg = (voided: { by: string; reason: string }) => `
  <rect x="${COLUMN.left}" y="380" width="${COLUMN.right - COLUMN.left}" height="84" rx="14" fill="${RED}" fill-opacity="0.1" stroke="${RED}" stroke-opacity="0.35"/>
  ${text(612, 412, 14, 800, RED, escapeSvg(fit(`POWÓD · ${voided.by.toUpperCase()}`, 14, COLUMN.right - 634, 2)), 'letter-spacing="2"')}
  ${text(612, 442, 19, 700, "#F3D3D9", escapeSvg(fit(voided.reason, 19, COLUMN.right - 634)))}`;

/**
 * The item's name on one line beside its icon, or, when it is too long, on
 * two smaller lines; its rarity and level stay under it.
 */
const itemSvg = (item: LootDrawResolvedNotificationEvent["item"]) => {
  const maxWidth = COLUMN.right - ITEM_NAME.x;
  const oneLine = textWidth(item.name, ITEM_NAME.size) <= maxWidth;

  const lines = oneLine
    ? [item.name]
    : wrap(item.name, ITEM_NAME.wrappedSize, maxWidth, 2);

  const size = oneLine ? ITEM_NAME.size : ITEM_NAME.wrappedSize;
  const top = lines.length > 1 ? 126 : 138;

  return `${lines
    .map((line, index) =>
      text(
        ITEM_NAME.x,
        top + index * 30,
        size,
        850,
        LEGENDARY,
        escapeSvg(line),
      ),
    )
    .join("")}
    ${text(ITEM_NAME.x, top + (lines.length - 1) * 30 + 32, 18, 600, MUTED, `Legendarny · ${item.lvl} lvl`)}`;
};

/** The result card, with the item's icon as a data URL when it was fetched. */
const lootDrawCardSvg = (
  event: LootDrawResolvedNotificationEvent,
  iconDataUrl: string | null,
) => {
  const { draw, item } = event;
  const voided = event.outcome === "VOIDED" ? draw.voided : null;
  const shownDraw = { ...draw, voided };
  const winner = draw.entrants[draw.winnerIndex];
  const total = draw.entrants.reduce((sum, { tickets }) => sum + tickets, 0);
  const share = formatDecimal(lootDrawTicketShare(winner?.tickets ?? 0, total));

  const winnerDetail = [
    winner?.lvl ? formatLevel(winner.lvl, winner.prof) : null,
    `${formatLootDrawTickets(winner?.tickets ?? 0)} z ${total} (${share}%)`,
  ]
    .filter(Boolean)
    .join(" · ");

  const heading = fit(
    event.npcName ? `KOŁO · ${event.npcName.toUpperCase()}` : "KOŁO",
    14,
    COLUMN.right - COLUMN.left - 160,
    3,
  );

  const footer = fit(
    voided
      ? `Zakręcił ${draw.drawnBy} · unieważnił ${voided.by}`
      : `Zakręcił ${draw.drawnBy}`,
    14,
    COLUMN.right - COLUMN.left,
  );

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${BACKGROUND}"/>
    ${wheelSvg(shownDraw)}
    ${text(COLUMN.left, 74, 14, 800, MUTED, escapeSvg(heading), 'letter-spacing="3"')}
    ${text(COLUMN.right, 74, 14, 800, MUTED, "lootlog.pl", 'text-anchor="end" fill-opacity="0.7"')}
    <rect x="${COLUMN.left}" y="100" width="84" height="84" rx="17" fill="#24190D" stroke="${LEGENDARY}" stroke-width="3"/>
    ${iconDataUrl ? `<image x="602" y="112" width="60" height="60" href="${iconDataUrl}"/>` : ""}
    ${itemSvg(item)}
    ${text(COLUMN.left, 250, 15, 800, voided ? MUTED : GOLD, voided ? "WYNIK UNIEWAŻNIONY" : "WYGRYWA", 'letter-spacing="3"')}
    ${text(588, 310, 54, 900, voided ? MUTED : TEXT, escapeSvg(fit(winner?.name ?? "", 54, COLUMN.right - 588)), voided ? 'text-decoration="line-through"' : "")}
    ${text(COLUMN.left, 344, 18, 600, MUTED, escapeSvg(fit(winnerDetail, 18, COLUMN.right - COLUMN.left)))}
    ${voided ? voidedSvg(voided) : entrantListSvg(shownDraw)}
    ${text(COLUMN.left, 596, 14, 600, FAINT, escapeSvg(footer))}
  </svg>`;
};

/** Draws a loot draw's result card for its Discord message. */
export class LootDrawCardImage {
  constructor(private readonly httpClient: HttpClientValue) {}

  render(
    event: LootDrawResolvedNotificationEvent,
  ): Effect.Effect<Buffer, unknown> {
    return Effect.gen({ self: this }, function* () {
      const icon = yield* this.fetchIcon(event.item.icon);

      return yield* Effect.tryPromise(() =>
        sharp(Buffer.from(lootDrawCardSvg(event, icon)))
          .png()
          .toBuffer(),
      );
    });
  }

  /** The icon scaled up without blur, or null: the card stands without it. */
  private fetchIcon(icon: string): Effect.Effect<string | null> {
    return outboundHttpRequest(this.httpClient, {
      adapter: "margonem-item-icon",
      method: "GET",
      responseLimitBytes: MAX_ICON_BYTES,
      retryTimes: 1,
      timeout: `${ICON_FETCH_TIMEOUT_MS} millis`,
      url: itemIconUrl(icon),
    }).pipe(
      Effect.flatMap((response) =>
        response.status >= 200 && response.status < 300
          ? Effect.tryPromise(() =>
              sharp(Buffer.from(response.body))
                .resize(128, 128, { kernel: "nearest" })
                .png()
                .toBuffer(),
            )
          : Effect.succeed(null),
      ),
      Effect.map((png) =>
        png ? `data:image/png;base64,${png.toString("base64")}` : null,
      ),
      Effect.orElseSucceed(() => null),
    );
  }
}
