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

const WIDTH = 1200;

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

/** The winner's slice stands out of the wheel by this much. */
const WINNER_OFFSET = 16;

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

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

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

  const paths = slices
    .map(({ index, from, to }) => {
      const isWinner = index === draw.winnerIndex;

      const [dx, dy] = isWinner
        ? polar(0, 0, WINNER_OFFSET, turn + (from + to) / 2)
        : [0, 0];

      const fill = voided ? VOIDED_SLICE : sliceColor(index);
      const opacity = voided || isWinner ? "" : 'fill-opacity="0.85"';

      return `<path d="${slicePath(
        WHEEL.cx + (dx ?? 0),
        WHEEL.cy + (dy ?? 0),
        isWinner ? WHEEL.radius + 6 : WHEEL.radius,
        turn + from,
        turn + to,
      )}" fill="${fill}" stroke="${BACKGROUND}" stroke-width="4" ${opacity}/>`;
    })
    .join("");

  const top = WHEEL.cy - WHEEL.radius;

  return `${paths}
    <circle cx="${WHEEL.cx}" cy="${WHEEL.cy}" r="40" fill="${BACKGROUND}"/>
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

      return `<rect x="590" y="${y - 12}" width="12" height="12" rx="3" fill="${sliceColor(index)}"/>
        ${text(612, y, 17, 700, "#DCE3F0", escapeSvg(truncate(entrant.name, 26)))}
        ${text(1120, y, 16, 700, MUTED, formatLootDrawTickets(entrant.tickets), 'text-anchor="end"')}`;
    })
    .join("");

  return `${text(590, top, 13, 800, FAINT, `POZOSTALI (${others.length})`, 'letter-spacing="2"')}
    ${rows}
    ${hidden > 0 ? text(612, top + 30 + shown.length * 28, 16, 700, FAINT, `i ${hidden} więcej`) : ""}`;
};

const voidedSvg = (voided: { by: string; reason: string }) => `
  <rect x="590" y="380" width="530" height="84" rx="14" fill="${RED}" fill-opacity="0.1" stroke="${RED}" stroke-opacity="0.35"/>
  ${text(612, 412, 14, 800, RED, `POWÓD · ${escapeSvg(truncate(voided.by, 30).toUpperCase())}`, 'letter-spacing="2"')}
  ${text(612, 442, 19, 700, "#F3D3D9", escapeSvg(truncate(voided.reason, 46)))}`;

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

  const heading = event.npcName
    ? `KOŁO · ${escapeSvg(truncate(event.npcName, 30).toUpperCase())}`
    : "KOŁO";

  const footer = voided
    ? `Zakręcił ${escapeSvg(draw.drawnBy)} · unieważnił ${escapeSvg(voided.by)}`
    : `Zakręcił ${escapeSvg(draw.drawnBy)}`;

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${BACKGROUND}"/>
    ${wheelSvg(shownDraw)}
    ${text(590, 74, 14, 800, MUTED, heading, 'letter-spacing="3"')}
    ${text(1120, 74, 14, 800, MUTED, "lootlog.pl", 'text-anchor="end" fill-opacity="0.7"')}
    <rect x="590" y="100" width="84" height="84" rx="17" fill="#24190D" stroke="${LEGENDARY}" stroke-width="3"/>
    ${iconDataUrl ? `<image x="602" y="112" width="60" height="60" href="${iconDataUrl}"/>` : ""}
    ${text(696, 138, 30, 850, LEGENDARY, escapeSvg(truncate(item.name, 28)))}
    ${text(696, 170, 18, 600, MUTED, `Legendarny · ${item.lvl} lvl`)}
    ${text(590, 250, 15, 800, voided ? MUTED : GOLD, voided ? "WYNIK UNIEWAŻNIONY" : "WYGRYWA", 'letter-spacing="3"')}
    ${text(588, 310, 54, 900, voided ? MUTED : TEXT, escapeSvg(truncate(winner?.name ?? "", 20)), voided ? 'text-decoration="line-through"' : "")}
    ${text(590, 344, 18, 600, MUTED, escapeSvg(winnerDetail))}
    ${voided ? voidedSvg(voided) : entrantListSvg(shownDraw)}
    ${text(590, 596, 14, 600, FAINT, footer)}
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
