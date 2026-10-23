import type {
  FactionWarChampionsResponseDto,
  FactionWarResponseDto,
  MyFactionWarPickDto,
} from "@lootlog/client/main";
import { FACTION_WARS, FactionWarFaction } from "@lootlog/domain/faction-war";
import { Option, Schema } from "effect";
import { logSandbox } from "./fake-runtime/sandbox-log";
import type { SandboxWorld } from "./fake-runtime/world";

/**
 * `?faction-war=pick`: a running war without a pick, so the pick screen opens.
 * `?faction-war=champions`: the hero picked and is a champion of the war,
 * with two other champions on the map, so highlights show on both
 * interfaces.
 * `?faction-war=ended`: the war ended with Barbatos ahead; the hero picked
 * Barbatos and is a champion, so the result screen shows every line.
 * `ended-tie` ends it on equal points, `ended-none` with nobody scoring.
 * `disqualified`: a running war the hero picked in and was excluded from.
 */
const SANDBOX_FACTION_WAR_MODES = [
  "pick",
  "champions",
  "ended",
  "ended-tie",
  "ended-none",
  "disqualified",
] as const;

export type SandboxFactionWarMode = (typeof SANDBOX_FACTION_WAR_MODES)[number];

const isSandboxFactionWarMode = (
  mode: string | null,
): mode is SandboxFactionWarMode =>
  SANDBOX_FACTION_WAR_MODES.some((known) => known === mode);

export const readSandboxFactionWarMode = (): SandboxFactionWarMode | null => {
  const mode = new URLSearchParams(window.location.search).get("faction-war");

  return isSandboxFactionWarMode(mode) ? mode : null;
};

/** Points a fake kill or loot earns, so toasts show after real events. */
const FAKE_AWARD_POINTS = 40;

const CREATE_KILL_OR_LOOT_PATH = /\/api\/lootlog\/(kills|loots)$/;

const FAKE_LATENCY_MS = 450;

const FACTION_WARS_PATH = /\/api\/lootlog\/faction-wars\/(.+)$/;

const SESSION_PATH = /\/api\/auth\/.*get-session$/;

/**
 * Stands in for a signed-in session while the local stack has none (signed
 * out, or the auth service is down), so the faction war states always show.
 */
const createOfflineSession = () => {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

  return {
    session: {
      id: "sandbox-session",
      userId: "sandbox-user",
      token: "sandbox",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: "sandbox-user",
      name: "Sandbox",
      email: "sandbox@lootlog.invalid",
      emailVerified: true,
      image: null,
      discordId: "0",
      createdAt: now,
      updatedAt: now,
    },
  };
};

const decodePickBody = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      faction: Schema.Literals([
        FactionWarFaction.BARBATOS,
        FactionWarFaction.TANROTH,
      ]),
      characterName: Schema.String,
      world: Schema.String,
    }),
  ),
);

const decodeUpdateBody = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      hiddenFromLeaderboard: Schema.optional(Schema.Boolean),
      championHighlightHidden: Schema.optional(Schema.Boolean),
    }),
  ),
);

const decodeJsonObject = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

const json = (
  status: number,
  body:
    | FactionWarResponseDto
    | FactionWarChampionsResponseDto
    | ReturnType<typeof createOfflineSession>
    | { code?: string; message: string },
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const readUrl = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : String(input);

/**
 * Answers the faction war endpoints in the browser, so the sandbox shows the
 * pick screen and champion highlights without a war in the local database.
 * Every other request goes to the local stack as before.
 */
export function installFakeFactionWarApi(
  mode: SandboxFactionWarMode,
  world: SandboxWorld,
): void {
  const [war] = FACTION_WARS;
  const heroId = String(world.hero.id);
  const ended = mode.startsWith("ended");

  const champion =
    mode === "champions" || mode === "ended" || mode === "ended-tie";

  let highlightHidden = false;
  let hiddenFromLeaderboard = false;

  const createPick = (
    faction: FactionWarFaction,
    points: number,
  ): MyFactionWarPickDto => ({
    faction,
    characterName: world.hero.nick,
    world: world.world,
    pickedAt: new Date().toISOString(),
    hiddenFromLeaderboard,
    disqualified: mode === "disqualified",
    points,
    todayBySource: { KILL: 84, LOOT: 20, ONLINE: 12, PVP: 5 },
  });

  let pick: MyFactionWarPickDto | null =
    mode === "pick" || mode === "ended-none"
      ? null
      : createPick("BARBATOS", 1240);

  const totals = (): FactionWarResponseDto["totals"] => {
    if (mode === "ended-none") {
      return [
        {
          faction: "BARBATOS",
          points: 0,
          rawPoints: 0,
          players: 3,
          multiplier: 1,
        },
        {
          faction: "TANROTH",
          points: 0,
          rawPoints: 0,
          players: 2,
          multiplier: 1,
        },
      ];
    }

    const tanroth = mode === "ended-tie" ? 48_210 : 41_877;

    return [
      {
        faction: "BARBATOS",
        points: ended ? 48_210 : 18_242,
        rawPoints: 13_030,
        players: 412,
        multiplier: ended ? 1 : 1.4,
      },
      {
        faction: "TANROTH",
        points: ended ? tanroth : 21_410,
        rawPoints: 21_410,
        players: 587,
        multiplier: 1,
      },
    ];
  };

  const winners = (): FactionWarResponseDto["winners"] => {
    if (!ended || mode === "ended-none") return [];

    return mode === "ended-tie" ? ["BARBATOS", "TANROTH"] : ["BARBATOS"];
  };

  const currentWar = (): FactionWarResponseDto => ({
    id: war.id,
    status: ended ? "ENDED" : "RUNNING",
    startsAt: new Date(war.startsAt).toISOString(),
    endsAt: new Date(war.endsAt).toISOString(),
    scoring: { ...war.scoring, underdogBonusCap: 2 },
    totals: totals(),
    winners: winners(),
    days: [],
    pick: pick && { ...pick, hiddenFromLeaderboard },
    champion: champion
      ? {
          warId: war.id,
          winners:
            mode === "ended-tie" ? ["BARBATOS", "TANROTH"] : ["BARBATOS"],
          isChampion: true,
          highlightHidden,
        }
      : null,
    isAdmin: false,
  });

  const champions = (): FactionWarChampionsResponseDto =>
    champion
      ? {
          warId: war.id,
          champions: [
            {
              faction: "BARBATOS",
              characterIds: highlightHidden ? ["800001"] : [heroId, "800001"],
            },
            { faction: "TANROTH", characterIds: ["800002"] },
          ],
        }
      : { warId: null, champions: [] };

  const respond = (
    method: string,
    path: string,
    query: URLSearchParams,
    body: string,
  ) => {
    if (method === "GET" && path === "current") return json(200, currentWar());

    if (method === "GET" && path === "champions") {
      // The API answers only for one world's characters.
      if (!world.world || query.get("world") !== world.world) {
        return json(400, { message: "Expected the hero's world" });
      }

      return json(200, champions());
    }

    if (method === "POST" && path === `${war.id}/pick`) {
      if (pick) {
        return json(409, {
          code: "FACTION_WAR_ALREADY_PICKED",
          message: "Already picked",
        });
      }

      const data = decodePickBody(body);

      pick = {
        ...createPick(data.faction, 0),
        characterName: data.characterName,
        world: data.world,
        todayBySource: { KILL: 0, LOOT: 0, ONLINE: 0, PVP: 0 },
      };

      return json(201, currentWar());
    }

    if (method === "PATCH" && path === `${war.id}/pick`) {
      const data = decodeUpdateBody(body);

      highlightHidden = data.championHighlightHidden ?? highlightHidden;
      hiddenFromLeaderboard =
        data.hiddenFromLeaderboard ?? hiddenFromLeaderboard;

      return json(200, currentWar());
    }

    return json(404, { message: "Not found" });
  };

  const originalFetch = window.fetch.bind(window);

  // A kill or loot the local API accepted earns the hero's faction points,
  // as the API does during a war, so the point toasts follow real events.
  const withFakeAward = async (response: Response) => {
    if (!response.ok || !pick || pick.disqualified || ended) return response;

    const body = decodeJsonObject(
      await response
        .clone()
        .text()
        .catch(() => ""),
    );

    if (Option.isNone(body)) return response;

    logSandbox("message", `fake +${FAKE_AWARD_POINTS} faction war points`);

    return new Response(
      JSON.stringify({
        ...body.value,
        factionWar: { faction: pick.faction, points: FAKE_AWARD_POINTS },
      }),
      { status: response.status, headers: response.headers },
    );
  };

  window.fetch = async (input, init) => {
    const url = new URL(readUrl(input), window.location.href);

    if (SESSION_PATH.test(url.pathname)) {
      const response = await originalFetch(input, init).catch(() => null);

      const signedIn =
        response?.ok === true &&
        (await response
          .clone()
          .text()
          .then((text) => text.includes('"user"'))
          .catch(() => false));

      if (response && signedIn) return response;

      logSandbox("message", "no local session: using a fake one");

      return json(200, createOfflineSession());
    }

    if (CREATE_KILL_OR_LOOT_PATH.test(url.pathname)) {
      return withFakeAward(await originalFetch(input, init));
    }

    const path = FACTION_WARS_PATH.exec(url.pathname)?.[1];

    if (!path) return originalFetch(input, init);

    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const body = await new Request(url, init).text();

    logSandbox("outbound", `fake ${method} /faction-wars/${path}`);
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

    return respond(method, path, url.searchParams, body);
  };
}
