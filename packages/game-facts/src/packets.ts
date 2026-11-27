import { Effect, Option } from "effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

const Count = Schema.Finite;

const CountLike = Schema.Union([Schema.Finite, Schema.FiniteFromString]);

const DialogField = Schema.Union([
  Schema.String,
  Schema.Finite.pipe(
    Schema.decodeTo(Schema.String, {
      decode: SchemaGetter.transform(String),
      encode: SchemaGetter.transform(Number),
    }),
  ),
]);

const optional = Schema.optionalKey;

const TownPacket = Schema.Struct({
  id: Count,
  name: Schema.String,
  file: Schema.String,
  mainid: optional(Count),
  bg: optional(Schema.String),
  pvp: optional(Count),
  params: optional(
    Schema.Struct({
      lvlMin: optional(Count),
      lvlMax: optional(Count),
      respawn: optional(Schema.String),
    }),
  ),
});

const IconEntry = Schema.Struct({ id: Count, icon: Schema.String });

const NpcTemplateEntry = Schema.Struct({
  id: Count,
  nick: Schema.String,
  level: optional(Count),
  prof: optional(Schema.String),
  type: optional(Count),
  warrior_type: optional(Count),
  elasticLevelFactor: optional(Count),
});

const NpcEntry = Schema.Struct({
  id: Count,
  tpl: optional(Count),
  x: optional(Count),
  y: optional(Count),
  icon: optional(Schema.Struct({ id: Count })),
});

const RemovedNpc = Schema.Struct({ id: Count });

const ShopPacket = Schema.Struct({
  id: optional(Count),
  cur: optional(Schema.String),
  buyp: optional(Count),
  items_offers: optional(
    Schema.Array(
      Schema.Struct({
        tplId: Count,
        price: Count,
        quantity: optional(Count),
      }),
    ),
  ),
  sellAction: optional(Schema.Unknown),
  buyAction: optional(Schema.Unknown),
});

const ItemEntry = Schema.Struct({
  id: optional(Count),
  tpl: optional(Count),
  name: optional(Schema.String),
  icon: optional(Schema.String),
  cl: optional(Count),
  stat: optional(Schema.String),
  pr: optional(Count),
  prc: optional(Schema.String),
  loc: optional(Schema.String),
});

const LootPacket = Schema.Struct({
  source: optional(Schema.String),
  states: optional(Schema.Record(Schema.String, Count)),
});

const WarriorStat = Schema.Struct({ cur: optional(Count) });

const Warrior = Schema.Struct({
  npc: optional(Count),
  originalId: optional(Count),
  name: optional(Schema.String),
  lvl: optional(Count),
  prof: optional(Schema.String),
  wt: optional(Count),
  hp: optional(Schema.Struct({ max: optional(Count) })),
  ac: optional(WarriorStat),
  resfire: optional(WarriorStat),
  resfrost: optional(WarriorStat),
  reslight: optional(WarriorStat),
  act: optional(WarriorStat),
});

const FightPacket = Schema.Struct({
  init: optional(CountLike),
  w: optional(Schema.Record(Schema.String, Warrior)),
});

const tolerant = <S extends Schema.Top>(schema: S) =>
  Schema.optionalKey(
    schema.pipe(Schema.catchDecoding(() => Effect.succeedNone)),
  );

const GamePacket = Schema.Struct({
  town: tolerant(TownPacket),
  townname: tolerant(Schema.Record(Schema.String, Schema.String)),
  gw2: tolerant(Schema.Array(Count)),
  icons: tolerant(Schema.Array(IconEntry)),
  npc_tpls: tolerant(Schema.Array(NpcTemplateEntry)),
  npcs: tolerant(Schema.Array(NpcEntry)),
  npcs_del: tolerant(Schema.Array(RemovedNpc)),
  d: tolerant(Schema.Array(DialogField)),
  t: tolerant(Schema.String),
  shop: tolerant(ShopPacket),
  item_tpl: tolerant(Schema.Record(Schema.String, ItemEntry)),
  item: tolerant(Schema.Record(Schema.String, ItemEntry)),
  loot: tolerant(LootPacket),
  f: tolerant(FightPacket),
});

export type GamePacket = typeof GamePacket.Type;

export type TownPacket = typeof TownPacket.Type;

export type ShopPacket = typeof ShopPacket.Type;

export type ItemEntry = typeof ItemEntry.Type;

export type LootPacket = typeof LootPacket.Type;

export type FightPacket = typeof FightPacket.Type;

export type WarriorStat = typeof WarriorStat.Type;

export type DecodedPacket = {
  readonly packet: GamePacket;
  readonly keys: ReadonlyArray<string>;
  readonly malformed: ReadonlyArray<string>;
};

const READ_KEYS: ReadonlySet<string> = new Set(Object.keys(GamePacket.fields));

const decodePacketObject = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Unknown),
);

const decodePacket = Schema.decodeUnknownOption(GamePacket);

export function decodeGamePacket(raw: unknown): DecodedPacket {
  const keys = Option.match(decodePacketObject(raw), {
    onNone: () => [],
    onSome: (object) => Object.keys(object),
  });

  const packet = Option.getOrElse(decodePacket(raw), () => ({}));

  return {
    packet,
    keys,
    malformed: keys.filter(
      (key) => READ_KEYS.has(key) && !Object.hasOwn(packet, key),
    ),
  };
}
