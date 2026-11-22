import { formatLevel } from "@lootlog/domain/profession";
import { escape, upperFirst } from "es-toolkit";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const linkPreviewBotPattern =
  /discordbot|slackbot|twitterbot|facebookexternalhit|facebot|telegrambot|whatsapp|linkedinbot|skypeuripreview|redditbot|embedly|iframely|mastodon|bluesky|cardyb/iu;

const publicBattlePathPattern = /^\/battles\/([^/]+)\/?$/u;

const battleFetchTimeoutMs = 2000;

const maxNamedWarriorsPerTeam = 3;

const PreviewBattle = Schema.Struct({
  type: Schema.String,
  world: Schema.String,
  winner: Schema.String,
  hasFlee: Schema.Boolean,
  unfinished: Schema.Boolean,
  warriors: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      lvl: Schema.Finite,
      prof: Schema.String,
      team: Schema.Finite,
    }),
  ),
});

type PreviewBattle = typeof PreviewBattle.Type;

const decodePreviewBattle = Schema.decodeUnknownOption(PreviewBattle);

export function getPreviewBattleId(
  request: Request,
  requestUrl: URL,
): string | null {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  if (!linkPreviewBotPattern.test(request.headers.get("user-agent") ?? "")) {
    return null;
  }

  const battleId = publicBattlePathPattern.exec(requestUrl.pathname)?.[1];

  return battleId ? decodeURIComponent(battleId) : null;
}

function formatTeam(warriors: PreviewBattle["warriors"]): string {
  const named = warriors
    .slice(0, maxNamedWarriorsPerTeam)
    .map(
      (warrior) =>
        `${warrior.name} (${formatLevel(warrior.lvl, warrior.prof)})`,
    )
    .join(", ");

  const hidden = warriors.length - maxNamedWarriorsPerTeam;

  return hidden > 0 ? `${named} +${hidden}` : named;
}

function formatTitle(battle: PreviewBattle): string {
  const teams = Object.groupBy(battle.warriors, (warrior) => warrior.team);

  return [teams[1], teams[2]]
    .flatMap((team) => (team ? [formatTeam(team)] : []))
    .join(" vs ");
}

function formatOutcome(battle: PreviewBattle): string {
  if (!battle.unfinished && battle.winner !== "?") {
    return `Zwycięzca: ${battle.winner}`;
  }

  return battle.hasFlee ? "Walka zakończona ucieczką" : "Remis";
}

function renderPreviewDocument(battle: PreviewBattle, pageUrl: URL): string {
  const title = escape(formatTitle(battle));

  const description = escape(
    `${formatOutcome(battle)} · ${upperFirst(battle.world)} · ${battle.type}`,
  );

  const url = escape(pageUrl.href);
  const image = escape(new URL("/brand/lootlog-social.png", pageUrl).href);

  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:site_name" content="Lootlog" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body>
    <a href="${url}">${title}</a>
  </body>
</html>
`;
}

export async function createBattleLinkPreview(
  battleId: string,
  requestUrl: URL,
  battlelogOrigin: string,
  upstreamFetch: (request: Request) => Promise<Response>,
): Promise<Response | null> {
  const battleUrl = new URL(
    `/battles/public/${encodeURIComponent(battleId)}`,
    battlelogOrigin,
  );

  try {
    const response = await upstreamFetch(
      new Request(battleUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(battleFetchTimeoutMs),
      }),
    );

    if (!response.ok) {
      return null;
    }

    const battle = decodePreviewBattle(await response.json());

    if (Option.isNone(battle)) {
      return null;
    }

    const pageUrl = new URL(requestUrl.pathname, requestUrl.origin);

    return new Response(renderPreviewDocument(battle.value, pageUrl), {
      headers: {
        "cache-control": "private, no-store",
        "content-type": "text/html; charset=utf-8",
        vary: "User-Agent",
      },
    });
  } catch {
    return null;
  }
}
