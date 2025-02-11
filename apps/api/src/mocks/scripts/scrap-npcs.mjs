import { parse } from 'node-html-parser';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://margoworld.pl/npc/';
const URL_MATCH = 'https://micc.garmory-cdn.cloud/obrazki/npc/';

const professions = ['p', 'w', 'h', 'b', 't', 'm'];
const NPC_PATHS = ['elite2', 'titan', 'elite', 'heros', 'kolos'];

const getRandomProfession = () => {
  return professions[Math.floor(Math.random() * professions.length)];
};

const getRandomWtByType = (type) => {
  switch (type) {
    case 'tytan':
      return 100;
    case 'kolos':
      return 90;
    case 'heros':
      return 80;
    case 'elita III':
      return 30;
    case 'elita II':
      return 20;
    case 'elita':
      return 10;
    default:
      return 0;
  }
};

const getNpcLevelFromMeta = (meta) => {
  const regex = /\<\/i>(.*?)\lvl<div>/g;
  const grpRegex = /\<\/i>(.*?)\lvl,/g;

  const lvl = regex.exec(meta) ?? grpRegex.exec(meta);

  if (!lvl) return Math.floor(Math.random() * 300);

  return +lvl[1];
};

const parseMeta = (meta) => {
  const parsed = parse(`<div>${meta}</div>`);

  const name = parsed.querySelector('b')?.textContent;

  const type = parsed.querySelector('i')?.textContent;
  const location = parsed
    .querySelector('div div')
    ?.textContent.replace(/\((.*?)\)/, '')
    .trim();
  const lvl = getNpcLevelFromMeta(meta);

  return {
    name,
    type,
    location,
    lvl,
  };
};

const scrapNpcsByType = async (type) => {
  const response = await fetch(`${BASE_URL}${type}`);
  const html = await response.text();

  const parsed = parse(html);
  const npcs = Array.from(parsed.querySelectorAll('table tr')).map((npc) => {
    const img = npc.querySelector('td .npc');
    const icon = img?.getAttribute('src').replace(URL_MATCH, '');
    const meta = parseMeta(img?.getAttribute('data-tip'));

    const id = npc.querySelector('td a')?.getAttribute('href').split('/')[3];

    return {
      icon,
      id: +id,
      prof: getRandomProfession(),
      hpp: 0,
      type: 2,
      wt: getRandomWtByType(meta.type),
      lvl: meta.lvl,
      name: meta.name,
      location: meta.location,
    };
  });

  return npcs.filter((npc) => npc.id && npc.lvl);
};

const scrapNpcs = async () => {
  const npcs = await Promise.all(NPC_PATHS.map(scrapNpcsByType));
  const flat = npcs.flat();

  writeFileSync('./src/mocks/data/npcs.json', JSON.stringify(flat, null, 2));
};

scrapNpcs();
