import type { GameEvent } from "@lootlog/margonem/game-events";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { SandboxWorld } from "./world";

// Stands in for the native Communication.parseJSON: it mutates game state from a
// packet before Lootlog's bridge wrapper observes the same packet.
export function applyGameEvent(world: SandboxWorld, event: GameEvent): void {
  if (event.town) applyTown(world, event.town);

  if (event.h) applyHero(world, event.h);

  applyNpcs(world, event);
  applyOthers(world, event.other ?? {});

  if (event.party) applyParty(world, event.party);
}

function applyTown(
  world: SandboxWorld,
  town: NonNullable<GameEvent["town"]>,
): void {
  Object.assign(world.map, {
    id: town.id,
    name: town.name,
    visibility: town.visibility,
  });
  clearRecord(world.npcs);
  clearRecord(world.others);
  world.npcTemplates.clear();
  world.npcIcons.clear();
}

function applyHero(
  world: SandboxWorld,
  patch: NonNullable<GameEvent["h"]>,
): void {
  const { hero } = world;

  hero.x = patch.x ?? hero.x;
  hero.y = patch.y ?? hero.y;
  hero.lvl = patch.lvl ?? hero.lvl;
  hero.nick = patch.nick ?? hero.nick;
  hero.img = patch.img ?? hero.img;
  hero.stasis = patch.stasis ?? hero.stasis;

  if ("clan" in patch) hero.clan = patch.clan;

  hero.warrior_stats.hp =
    patch.warrior_stats?.hp ?? patch.hp ?? hero.warrior_stats.hp;
  hero.warrior_stats.maxhp =
    patch.warrior_stats?.maxhp ?? patch.maxhp ?? hero.warrior_stats.maxhp;
}

function applyNpcs(world: SandboxWorld, event: GameEvent): void {
  for (const template of event.npc_tpls ?? [])
    world.npcTemplates.set(template.id, template);

  for (const icon of event.icons ?? []) world.npcIcons.set(icon.id, icon.icon);

  for (const entry of event.npcs ?? []) {
    const npc = composeNpc(world, entry);

    if (npc) world.npcs[String(npc.id)] = npc;
  }

  for (const { id } of event.npcs_del ?? []) delete world.npcs[String(id)];
}

function applyOthers(
  world: SandboxWorld,
  others: NonNullable<GameEvent["other"]>,
): void {
  for (const [id, entry] of Object.entries(others)) {
    if ("del" in entry) {
      delete world.others[id];
    } else if ("action" in entry) {
      world.others[id] = {
        id,
        account: entry.account,
        icon: entry.icon,
        lvl: entry.lvl,
        nick: entry.nick,
        prof: entry.prof,
        x: entry.x,
        y: entry.y,
      };
    } else if (world.others[id]) {
      Object.assign(world.others[id], { x: entry.x, y: entry.y });
    }
  }
}

function applyParty(
  world: SandboxWorld,
  party: NonNullable<GameEvent["party"]>,
): void {
  world.party.clear();

  for (const member of Object.values(party.members)) {
    world.party.set(member.id, {
      id: member.id,
      accountId: member.account,
      icon: member.icon,
      leader: member.commander === 1,
      hp: [member.hp_cur ?? 0, member.hp_max ?? 0],
      nick: member.nick,
      profession: null,
    });
  }
}

function composeNpc(
  world: SandboxWorld,
  entry: NonNullable<GameEvent["npcs"]>[number],
): GameNpc | null {
  const existing = world.npcs[String(entry.id)];
  const template = world.npcTemplates.get(entry.tpl);
  const icon = world.npcIcons.get(entry.icon.id) ?? existing?.icon;

  if (!template || icon === undefined) {
    if (!existing) return null;

    return { ...existing, x: entry.x, y: entry.y };
  }

  return {
    id: entry.id,
    tpl: entry.tpl,
    icon,
    x: entry.x,
    y: entry.y,
    nick: template.nick,
    prof: template.prof,
    type: template.type,
    wt: template.warrior_type ?? 0,
    lvl:
      template.elasticLevelFactor === 0
        ? world.hero.lvl
        : (template.level ?? world.hero.lvl),
    resp_rand: template.resp_rand,
  };
}

function clearRecord<Value>(record: Record<string, Value>): void {
  for (const key of Object.keys(record)) delete record[key];
}
