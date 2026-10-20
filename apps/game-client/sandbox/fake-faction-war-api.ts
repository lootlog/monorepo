import type {
  FactionWarChampionsResponseDto,
  FactionWarResponseDto,
  MyFactionWarPickDto,
} from "@lootlog/client/main";
import { FACTION_WARS, FactionWarFaction } from "@lootlog/domain/faction-war";
import { Schema } from "effect";
import { logSandbox } from "./fake-runtime/sandbox-log";
import type { SandboxWorld } from "./fake-runtime/world";

/**
 * `?faction-war=pick`: a running war without a pick, so the pick screen opens.
 * `?faction-war=champions`: the hero picked and is a champion of the war,
 * with two other champions on the map, so highlights show on both
 * interfaces.
 */
export type SandboxFactionWarMode = "pick" | "champions";

export const readSandboxFactionWarMode = (): SandboxFactionWarMode | null => {
  const mode = new URLSearchParams(window.location.search).get("faction-war");

  return mode === "pick" || mode === "champions" ? mode : null;
};

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
  let highlightHidden = false;

  let pick: MyFactionWarPickDto | null =
    mode === "champions"
      ? {
          faction: "BARBATOS",
          characterName: world.hero.nick,
          world: world.world,
          pickedAt: new Date().toISOString(),
          hiddenFromLeaderboard: false,
          points: 1240,
          todayBySource: { KILL: 84, LOOT: 20, ONLINE: 12, PVP: 5 },
        }
      : null;

  const currentWar = (): FactionWarResponseDto => ({
    id: war.id,
    status: "RUNNING",
    startsAt: new Date(war.startsAt).toISOString(),
    endsAt: new Date(war.endsAt).toISOString(),
    scoring: { ...war.scoring, underdogBonusCap: 2 },
    totals: [
      {
        faction: "BARBATOS",
        points: 18_242,
        rawPoints: 13_030,
        players: 412,
        multiplier: 1.4,
      },
      {
        faction: "TANROTH",
        points: 21_410,
        rawPoints: 21_410,
        players: 587,
        multiplier: 1,
      },
    ],
    winners: [],
    days: [],
    pick,
    champion:
      mode === "champions"
        ? {
            warId: war.id,
            winners: ["BARBATOS"],
            isChampion: true,
            highlightHidden,
          }
        : null,
  });

  const champions = (): FactionWarChampionsResponseDto =>
    mode === "champions"
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

  const respond = (method: string, path: string, body: string) => {
    if (method === "GET" && path === "current") return json(200, currentWar());

    if (method === "GET" && path === "champions") return json(200, champions());

    if (method === "POST" && path === `${war.id}/pick`) {
      if (pick) {
        return json(409, {
          code: "FACTION_WAR_ALREADY_PICKED",
          message: "Already picked",
        });
      }

      const data = decodePickBody(body);

      pick = {
        faction: data.faction,
        characterName: data.characterName,
        world: data.world,
        pickedAt: new Date().toISOString(),
        hiddenFromLeaderboard: false,
        points: 0,
        todayBySource: { KILL: 0, LOOT: 0, ONLINE: 0, PVP: 0 },
      };

      return json(201, currentWar());
    }

    if (method === "PATCH" && path === `${war.id}/pick`) {
      const data = decodeUpdateBody(body);

      highlightHidden = data.championHighlightHidden ?? highlightHidden;

      return json(200, currentWar());
    }

    return json(404, { message: "Not found" });
  };

  const originalFetch = window.fetch.bind(window);

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

    const path = FACTION_WARS_PATH.exec(url.pathname)?.[1];

    if (!path) return originalFetch(input, init);

    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const body = await new Request(url, init).text();

    logSandbox("outbound", `fake ${method} /faction-wars/${path}`);
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

    return respond(method, path, body);
  };
}
