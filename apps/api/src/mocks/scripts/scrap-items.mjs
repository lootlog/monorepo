import { parse } from 'node-html-parser';
import { v6 } from 'uuid';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://margoworld.pl/item/';

const scrapPage = async (page) => {
  const response = await fetch(
    `${BASE_URL}?name=&minLvl=&maxLvl=&cl=&unique=on&heroic=on&upgraded=on&legendary=on&p=${page}`,
  );
  const html = await response.text();

  const parsed = parse(html);

  const npcs = Array.from(parsed.querySelectorAll('.itemborder span')).reduce(
    (acc, item) => {
      const itemData = item?.getAttribute('data-itemtip');

      if (!itemData) return acc;

      const hid = v6();
      const json = JSON.parse(itemData);

      return [
        ...acc,
        {
          hid,
          id: json.id,
          icon: json.icon,
          pr: json.pr,
          prc: 'zl',
          st: 0,
          stat: json.stat,
          name: json.name,
          cl: json.cl,
        },
      ];
    },
    [],
  );

  return npcs;
};

const getNumberOfPages = async () => {
  const response = await fetch(
    `${BASE_URL}?name=&minLvl=&maxLvl=&cl=&unique=on&heroic=on&upgraded=on&legendary=on`,
  );
  const html = await response.text();

  const parsed = parse(html);

  const pages = Array.from(parsed.querySelectorAll('.pagination li'));
  const numberOfPages = pages[pages.length - 1].textContent;

  return +numberOfPages;
};

const scrapItems = () => {
  const items = getNumberOfPages().then(async (numberOfPages) => {
    const items = await Promise.all(
      Array.from({ length: numberOfPages }, (_, i) => scrapPage(i + 1)),
    );

    const flat = items.flat();

    writeFileSync('./src/mocks/data/items.json', JSON.stringify(flat, null, 2));
  });

  return items;
};

scrapItems();

// scrapItems().then(console.log);

// scrapIte;
