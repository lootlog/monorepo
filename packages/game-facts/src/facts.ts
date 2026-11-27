import * as Schema from "effect/Schema";
import {
  DateTimeString,
  NonNegativeSafeInteger,
  PositiveSafeInteger,
  SafeInteger,
} from "@lootlog/schema/http-scalars";

export const GAME_FACTS_EXTRACTOR_VERSION = 1;

const boundedText = (maxLength: number) =>
  Schema.String.check(
    Schema.isMaxLength(maxLength).annotate({
      expected: `a value with a length of at most ${maxLength}`,
    }),
  );

const Name = boundedText(200);

const Path = boundedText(300);

const Text = boundedText(5000);

const Level = NonNegativeSafeInteger;

const Id = PositiveSafeInteger;

const Tile = NonNegativeSafeInteger;

const DialogOptionId = boundedText(40).check(
  Schema.isPattern(/^\d+(?:\.\d+)?$/u).annotate({
    expected: "a dialog option id such as 20.1",
  }),
);

const DialogNodeId = boundedText(40).check(
  Schema.isPattern(/^\d+$/u).annotate({ expected: "a dialog node id" }),
);

const MapFact = Schema.Struct({
  kind: Schema.Literal("MAP"),
  mapId: Id,
  parentMapId: Schema.NullOr(Id),
  name: Name,
  file: Path,
  background: Schema.NullOr(Path),
  pvp: SafeInteger,
  minLevel: Schema.NullOr(Level),
  maxLevel: Schema.NullOr(Level),
  respawnMapName: Schema.NullOr(Name),
}).annotate({
  identifier: "GameMapFact",
  description: "A map as the game describes it on entering.",
});

const GatewayFact = Schema.Struct({
  kind: Schema.Literal("GATEWAY"),
  fromMapId: Id,
  toMapId: Id,
  toMapName: Schema.NullOr(Name),
  x: Tile,
  y: Tile,
  requiresKey: Schema.Boolean,
  minLevel: Schema.NullOr(Level),
  maxLevel: Schema.NullOr(Level),
}).annotate({
  identifier: "GameGatewayFact",
  description: "A passage on one map tile leading to another map.",
});

const NpcFact = Schema.Struct({
  kind: Schema.Literal("NPC"),
  npcId: Id.annotate({ description: "The NPC template id." }),
  name: Name,
  level: Schema.NullOr(Level).annotate({
    description:
      "`null` for an elastic NPC, whose level follows the hero's level.",
  }),
  profession: Schema.NullOr(boundedText(1)),
  margonemType: Schema.NullOr(SafeInteger),
  warriorType: Schema.NullOr(SafeInteger),
  elastic: Schema.Boolean,
}).annotate({ identifier: "GameNpcFact", description: "An NPC template." });

const NpcPlacementFact = Schema.Struct({
  kind: Schema.Literal("NPC_PLACEMENT"),
  mapId: Id,
  npcId: Id,
  x: Tile,
  y: Tile,
  icon: Schema.NullOr(Path),
}).annotate({
  identifier: "GameNpcPlacementFact",
  description: "An NPC standing on a map tile.",
});

const MonsterStatsFact = Schema.Struct({
  kind: Schema.Literal("MONSTER_STATS"),
  npcId: Id,
  name: Name,
  level: Level,
  profession: Schema.NullOr(boundedText(1)),
  warriorType: Schema.NullOr(SafeInteger),
  hp: NonNegativeSafeInteger,
  armor: Schema.NullOr(SafeInteger),
  fireResistance: Schema.NullOr(SafeInteger),
  frostResistance: Schema.NullOr(SafeInteger),
  lightningResistance: Schema.NullOr(SafeInteger),
  poisonResistance: Schema.NullOr(SafeInteger),
}).annotate({
  identifier: "GameMonsterStatsFact",
  description: "A monster's statistics as a fight reveals them.",
});

const DialogOption = Schema.Struct({
  optionId: DialogOptionId,
  text: Text,
  flags: NonNegativeSafeInteger.annotate({
    description:
      "The game's line flags: 4 ends the talk, 8 and 16 mark quests, 32 a shop.",
  }),
});

const DialogNodeFact = Schema.Struct({
  kind: Schema.Literal("DIALOG_NODE"),
  npcId: Id,
  nodeId: DialogNodeId,
  speaker: Name,
  text: Text,
  options: Schema.mutable(Schema.Array(DialogOption)).check(
    Schema.isMaxLength(64),
  ),
}).annotate({
  identifier: "GameDialogNodeFact",
  description:
    "One step of an NPC talk, its text kept as the game sends it, with [SEX=…|…] and [NICK] placeholders.",
});

const DialogTransitionFact = Schema.Struct({
  kind: Schema.Literal("DIALOG_TRANSITION"),
  npcId: Id,
  optionId: DialogOptionId,
  nextNodeId: Schema.NullOr(DialogNodeId),
  shopId: Schema.NullOr(Id),
  teleportMapId: Schema.NullOr(Id),
}).annotate({
  identifier: "GameDialogTransitionFact",
  description:
    "Where choosing a dialog option leads; every target `null` ends the talk.",
});

const ShopOffer = Schema.Struct({
  itemId: Id,
  price: NonNegativeSafeInteger,
  quantity: NonNegativeSafeInteger,
});

const ShopFact = Schema.Struct({
  kind: Schema.Literal("SHOP"),
  shopId: Id,
  npcId: Schema.NullOr(Id),
  currency: boundedText(20),
  buyBackPercent: Schema.NullOr(NonNegativeSafeInteger),
  offers: Schema.mutable(Schema.Array(ShopOffer)).check(
    Schema.isMaxLength(500),
  ),
}).annotate({ identifier: "GameShopFact", description: "A shop's offer." });

const ItemFact = Schema.Struct({
  kind: Schema.Literal("ITEM"),
  itemId: Id.annotate({ description: "The item template id." }),
  name: Name,
  icon: Path,
  itemClass: SafeInteger,
  stat: Text,
  price: NonNegativeSafeInteger,
  currency: boundedText(20),
}).annotate({ identifier: "GameItemFact", description: "An item template." });

const DropFact = Schema.Struct({
  kind: Schema.Literal("DROP"),
  itemId: Id,
  npcIds: Schema.mutable(Schema.Array(Id)).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(20),
  ),
}).annotate({
  identifier: "GameDropFact",
  description: "An item dropped after a fight against these NPC templates.",
});

export const GameFact = Schema.Union([
  MapFact,
  GatewayFact,
  NpcFact,
  NpcPlacementFact,
  MonsterStatsFact,
  DialogNodeFact,
  DialogTransitionFact,
  ShopFact,
  ItemFact,
  DropFact,
]);

export type GameFact = typeof GameFact.Type;

export type GameFactKind = GameFact["kind"];

export const GAME_FACT_KINDS = [
  "MAP",
  "GATEWAY",
  "NPC",
  "NPC_PLACEMENT",
  "MONSTER_STATS",
  "DIALOG_NODE",
  "DIALOG_TRANSITION",
  "SHOP",
  "ITEM",
  "DROP",
] as const satisfies ReadonlyArray<GameFactKind>;

export const ObservedGameFact = Schema.Struct({
  observedAt: DateTimeString,
  fact: GameFact,
}).annotate({ identifier: "ObservedGameFact" });

export type ObservedGameFact = typeof ObservedGameFact.Type;

export const gameFactSubject = (fact: GameFact): string => {
  switch (fact.kind) {
    case "MAP":
      return `${fact.mapId}`;
    case "GATEWAY":
      return `${fact.fromMapId}:${fact.x}:${fact.y}`;
    case "NPC":
      return `${fact.npcId}`;
    case "NPC_PLACEMENT":
      return `${fact.mapId}:${fact.npcId}:${fact.x}:${fact.y}`;
    case "MONSTER_STATS":
      return `${fact.npcId}`;
    case "DIALOG_NODE":
      return `${fact.npcId}:${fact.nodeId}`;
    case "DIALOG_TRANSITION":
      return `${fact.npcId}:${fact.optionId}`;
    case "SHOP":
      return `${fact.shopId}`;
    case "ITEM":
      return `${fact.itemId}`;
    case "DROP":
      return `${fact.itemId}:${[...fact.npcIds].sort((a, b) => a - b).join(",")}`;
  }
};
