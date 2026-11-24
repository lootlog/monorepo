import page from "./index.html";
import {
  PROFESSION_NAMES,
  PROFESSIONS,
  RARITIES,
  SLOTS,
  SOURCE_GROUP_KEYS,
  loadItems,
  type Item,
  type Slot,
} from "./items.js";
import { DEFAULT_OPTIONS, solveHunterLoadout } from "./solver.js";

const SLOT_LABELS: Record<Slot, string> = {
  weapon: "Broń dystansowa",
  secondary: "Kołczan",
  ARMOR: "Zbroja",
  HELMET: "Hełm",
  BOOTS: "Buty",
  GLOVES: "Rękawice",
  RING: "Pierścień",
  NECKLACE: "Naszyjnik",
};

const SOURCE_LABELS = new Map(
  Object.entries({
    TITAN: "tytan",
    COLOSSUS: "kolos",
    HERO: "heros",
    EVENT_HERO: "heros eventowy",
    ELITE3: "elita III",
    ELITE2: "elita II",
    ELITE: "elita",
    COMMON: "zwykły potwór",
    NPC: "NPC",
  }),
);

const hundredths = (value: string) => (Number(value) / 100).toFixed(2);

const percent = (value: string) => `${value}%`;

const STAT_LABELS = new Map<
  string,
  readonly [string, (value: string) => string]
>(
  Object.entries({
    dmg: ["Obrażenia", (value) => value.replace(",", "–")],
    pdmg: ["Atak fizyczny", String],
    hp: ["Życie", String],
    sa: ["Szybkość ataku", hundredths],
    dz: ["Zręczność", String],
    ds: ["Siła", String],
    di: ["Intelekt", String],
    da: ["Wszystkie cechy", String],
    ac: ["Pancerz", String],
    evade: ["Unik", String],
    crit: ["Cios krytyczny", percent],
    critval: ["Siła krytyka", percent],
    pierce: ["Przebicie pancerza", percent],
    lowevade: ["Obniżenie uniku", String],
    lowcrit: ["Obniżenie krytyka", percent],
    acdmg: ["Niszczenie pancerza", String],
    heal: ["Leczenie", String],
    adest: ["Obniżenie leczenia przeciwnika", String],
    slow: ["Obniżenie SA przeciwnika", hundredths],
    poison: [
      "Trucizna",
      (value) => {
        const [slow = "0", damage = "0"] = value.split(",");

        return `${damage} (spowalnia o ${hundredths(slow)})`;
      },
    ],
    wound: [
      "Głęboka rana",
      (value) => {
        const [chance = "0", damage = "0"] = value.split(",");

        return `${chance}% na ${damage}`;
      },
    ],
    act: ["Odporność na truciznę", percent],
    resfire: ["Odporność na ogień", percent],
    resfrost: ["Odporność na zimno", percent],
    reslight: ["Odporność na błyskawice", percent],
    dmgmul: ["Obrażenia", (value) => `+${value}%`],
    dmgmulphysical: ["Obrażenia fizyczne", (value) => `+${value}%`],
    energybon: ["Energia", String],
    manabon: ["Mana", String],
    enfatig: ["Niszczenie energii", String],
    manafatig: ["Niszczenie many", String],
  } satisfies Record<string, readonly [string, (value: string) => string]>),
);

const MODELLED_KEYS = new Set([
  "dmg",
  "pdmg",
  "hp",
  "sa",
  "dz",
  "ds",
  "da",
  "ac",
  "evade",
  "crit",
  "critval",
  "pierce",
  "lowevade",
  "lowcrit",
  "acdmg",
  "heal",
  "adest",
  "slow",
  "poison",
  "wound",
  "act",
  "resfire",
  "resfrost",
  "reslight",
  "dmgmul",
  "dmgmulphysical",
]);

const presentItem = (item: Item | undefined) =>
  item === undefined
    ? null
    : {
        name: item.name,
        icon: item.icon,
        lvl: item.lvl,
        rarity: item.rarity,
        elastic: item.elastic,
        event: item.event,
        legendaryBonus: item.legendaryBonus,
        sources: [
          ...new Set(
            item.sources.map((type) => SOURCE_LABELS.get(type) ?? type),
          ),
        ],
        stats: Object.entries(item.record).flatMap(([key, value]) => {
          const label = STAT_LABELS.get(key);

          return label === undefined
            ? []
            : [
                {
                  label: label[0],
                  value: label[1](value),
                  modelled: MODELLED_KEYS.has(key),
                },
              ];
        }),
      };

const documents = await loadItems(Bun.env.POSTGRESQL_CONNECTION_URI);

const problem = (message: string) =>
  Response.json({ error: message }, { status: 422 });

type Solution = ReturnType<typeof solveHunterLoadout>;

type Fighter = Solution["builds"][number]["result"]["me"];

const describeFighter = (fighter: Fighter) => ({
  hp: fighter.stats.hp,
  attackSpeed: fighter.stats.attackSpeed,
  damage: (fighter.stats.physical.min + fighter.stats.physical.max) / 2,
  critChance: fighter.stats.critChance,
  critValue: fighter.stats.critValue,
  pierce: fighter.stats.pierce,
  armor: fighter.stats.armor,
  evadeChance: fighter.stats.evadeChance,
  blockChance: fighter.stats.blockChance,
  healing: fighter.stats.healing,
  healReduction: fighter.extra.adest ?? 0,
  poisonResistance: fighter.extra.act ?? 0,
  lowevade: fighter.extra.lowevade ?? 0,
  armorDestruction: fighter.extra.acdmg ?? 0,
});

const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 4317),
  idleTimeout: 120,
  routes: {
    "/": page,
    "/api/solve": (request) => {
      const params = new URL(request.url).searchParams;
      const level = Number(params.get("level"));
      const goal = params.get("goal");
      const opponent = params.get("opponent");

      if (params.get("profession") !== "h") {
        return problem("Prototyp liczy na razie tylko łowcę.");
      }

      if (goal !== "group" && goal !== "duel") {
        return problem("Wybierz cel: ustawki albo walka 1 na 1.");
      }

      const opponentProfession = PROFESSIONS.find(
        (profession) => profession === opponent,
      );

      if (goal === "duel" && opponentProfession === undefined) {
        return problem("Wybierz profesję przeciwnika.");
      }

      if (!Number.isInteger(level) || level < 25 || level > 500) {
        return problem(
          "Poziom postaci musi być liczbą całkowitą od 25 do 500.",
        );
      }

      const sources = params
        .getAll("source")
        .flatMap((value) => SOURCE_GROUP_KEYS.filter((key) => key === value));

      const rarities = params
        .getAll("rarity")
        .flatMap((value) => RARITIES.filter((key) => key === value));

      if (sources.length === 0)
        return problem("Zaznacz przynajmniej jedno źródło przedmiotów.");

      if (rarities.length === 0)
        return problem("Zaznacz przynajmniej jedną rzadkość przedmiotów.");

      const started = performance.now();

      const solution = solveHunterLoadout(documents, {
        ...DEFAULT_OPTIONS,
        mode: goal,
        opponent: opponentProfession ?? "h",
        level,
        filters: {
          sources,
          rarities,
          includeEvents: params.get("events") === "on",
        },
      });

      return Response.json({
        elapsedMs: Math.round(performance.now() - started),
        goal,
        candidateCount: solution.candidateCount,
        opponents: solution.opponents.map(({ build, fighter }) => ({
          profession: PROFESSION_NAMES[build.profession],
          weapons: [build.gear.weapon?.name, build.gear.secondary?.name].filter(
            Boolean,
          ),
          stats: describeFighter(fighter),
        })),
        builds: solution.builds.map((build) => ({
          path: build.path,
          label: build.label,
          advantage: build.advantage,
          costVersusBest: build.costVersusBest,
          me: describeFighter(build.result.me),
          perOpponent: build.result.perOpponent.map((entry) => ({
            profession: PROFESSION_NAMES[entry.profession],
            myTimeToKill: entry.myTimeToKill,
            theirTimeToKill: entry.theirTimeToKill,
            poisonShare: entry.poisonShare,
          })),
          statValues: build.statValues,
          skills: build.skills,
          skillPoints: build.skillPoints,
          slots: SLOTS.map((slot) => ({
            slot,
            label: SLOT_LABELS[slot],
            candidates: solution.candidatesPerSlot[slot],
            item: presentItem(build.build.gear[slot]),
            alternatives: build.alternatives[slot].map(({ item, loss }) => ({
              item: presentItem(item),
              loss,
            })),
          })),
        })),
      });
    },
  },
});

process.stdout.write(
  `PROTOTYP solvera zestawów: ${server.url} (${documents.length} przedmiotów w pamięci)\n`,
);
