import { v6 } from 'uuid';
import crypto from 'crypto';

import npcs from '../data/npcs.json' with { type: 'json' };
import items from '../data/items.json' with { type: 'json' };
import players from '../data/players.json' with { type: 'json' };

const worlds = [
  'gordion',
  'classic',
  'katahha',
  'experimental',
  'aldous',
  'gefion',
  'tempest',
];
const sources = ['FIGHT', 'DIALOG'];

const getRandomLootItems = (desiredAmount) => {
  const amount = crypto.randomInt(1, desiredAmount + 1);
  const loots = Array.from({ length: amount }, () => {
    const item = items[crypto.randomInt(0, items.length)];

    return {
      ...item,
      hid: v6(),
    };
  });

  return loots;
};

const getRandomNpc = () => {
  return npcs[crypto.randomInt(0, npcs.length)];
};

const getRandomPlayers = (desiredAmount = 10) => {
  const amount = crypto.randomInt(1, desiredAmount + 1);
  return Array.from({ length: amount }, () => {
    return players[crypto.randomInt(0, players.length)];
  });
};

const generateLootPayload = () => {
  const source = sources[crypto.randomInt(0, sources.length)];
  const loots =
    source === 'FIGHT' ? getRandomLootItems(10) : getRandomLootItems(1);

  const npc = getRandomNpc();
  const players =
    source === 'FIGHT' ? getRandomPlayers(10) : getRandomPlayers(1);
  const world = worlds[crypto.randomInt(0, worlds.length)];

  return {
    npcs: [{ ...npc, location: npc.location ?? 'random location' }],
    loots: loots.map((loot) => ({
      hid: loot.hid,
      id: loot.id,
      name: loot.name,
      icon: loot.icon,
      pr: loot.pr,
      prc: loot.prc,
      stat: loot.stat,
      cl: loot.cl,
    })),
    players: players.map((player, i) => ({
      id: player.originalId,
      name: player.name,
      lvl: player.lvl,
      prof: player.prof,
      icon: player.icon,
      accountId: player.originalId,
      hpp: crypto.randomInt(0, 100),
    })),
    world,
    source,
    location: npc.location ?? 'random location',
  };
};

export default generateLootPayload;
