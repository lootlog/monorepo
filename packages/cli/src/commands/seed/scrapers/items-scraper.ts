import { parse } from "node-html-parser";
import { v7 as uuidv7 } from "uuid";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { SCRAPER_CONFIG } from "../config.js";
import { fileExists } from "../utils/file-exists.js";

interface ScrapedItem {
  hid: string;
  id: number;
  icon: string;
  pr: number;
  prc: string;
  st: number;
  stat: string;
  name: string;
  cl: number;
}

const BASE_URL =
  SCRAPER_CONFIG.margoworld.baseUrl + SCRAPER_CONFIG.margoworld.itemsPath;

async function scrapePage(page: number): Promise<ScrapedItem[]> {
  const url = `${BASE_URL}?name=&minLvl=&maxLvl=&cl=&unique=on&heroic=on&upgraded=on&legendary=on&p=${page}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
    }

    const html = await response.text();
    const parsed = parse(html);

    const items = Array.from(
      parsed.querySelectorAll(".itemborder span"),
    ).reduce<ScrapedItem[]>((acc, item) => {
      const itemData = item?.getAttribute("data-itemtip");

      if (!itemData) return acc;

      try {
        const json = JSON.parse(itemData);
        const hid = uuidv7();

        return [
          ...acc,
          {
            hid,
            id: json.id,
            icon: json.icon,
            pr: json.pr,
            prc: "zl",
            st: 0,
            stat: json.stat,
            name: json.name,
            cl: json.cl,
          },
        ];
      } catch (error) {
        console.warn(`Failed to parse item data on page ${page}:`, error);
        return acc;
      }
    }, []);

    return items;
  } catch (error) {
    console.error(`Error scraping page ${page}:`, error);
    return [];
  }
}

async function getNumberOfPages(): Promise<number> {
  const url = `${BASE_URL}?name=&minLvl=&maxLvl=&cl=&unique=on&heroic=on&upgraded=on&legendary=on`;

  const response = await fetch(url);
  const html = await response.text();

  const parsed = parse(html);
  const pages = Array.from(parsed.querySelectorAll(".pagination li"));
  const numberOfPages = pages[pages.length - 1]?.textContent;

  return numberOfPages ? Number(numberOfPages) : 1;
}

export async function scrapeItems(
  outputPath?: string,
  force = false,
): Promise<ScrapedItem[]> {
  if (outputPath && !force) {
    const fullPath = path.resolve(outputPath);
    const exists = await fileExists(fullPath);

    if (exists) {
      console.log(`⏭️  Items file already exists at ${fullPath}`);
      console.log("💡 Use --force flag to re-scrape");

      const fs = await import("fs/promises");
      const existingData = await fs.readFile(fullPath, "utf-8");
      return JSON.parse(existingData);
    }
  }

  console.log("Starting items scraping...");

  const numberOfPages = await getNumberOfPages();
  console.log(`Found ${numberOfPages} pages to scrape`);

  const items: ScrapedItem[] = [];

  for (let i = 1; i <= numberOfPages; i++) {
    console.log(`Scraping page ${i}/${numberOfPages}...`);
    const pageItems = await scrapePage(i);
    items.push(...pageItems);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Scraped ${items.length} items successfully`);

  if (outputPath) {
    const fullPath = path.resolve(outputPath);
    await writeFile(fullPath, JSON.stringify(items, null, 2));
    console.log(`Items saved to ${fullPath}`);
  }

  return items;
}
