import { parse } from "node-html-parser";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { SCRAPER_CONFIG } from "../config.js";
import { fileExists } from "../utils/file-exists.js";

interface ScrapedNpc {
  icon: string;
  id: number;
  prof: string;
  hpp: number;
  type: number;
  wt: number;
  lvl: number;
  name: string;
  location?: string;
}

const BASE_URL =
  SCRAPER_CONFIG.margoworld.baseUrl + SCRAPER_CONFIG.margoworld.npcsPath;
const URL_MATCH = SCRAPER_CONFIG.margoworld.imageUrlMatch;

const NPC_TYPE_WT_MAP: Record<string, number> = {
  tytan: 100,
  kolos: 90,
  heros: 80,
  "elita III": 30,
  "elita II": 20,
  elita: 10,
};

function getRandomProfession(): string {
  const { professions } = SCRAPER_CONFIG;
  return professions[Math.floor(Math.random() * professions.length)] ?? "w";
}

function getWtByType(type: string): number {
  return NPC_TYPE_WT_MAP[type] ?? 0;
}

function getNpcLevelFromMeta(meta: string): number {
  const regex = /<\/i>(.*?)lvl<div>/;
  const grpRegex = /<\/i>(.*?)lvl,/;

  const lvl = regex.exec(meta) ?? grpRegex.exec(meta);

  if (!lvl) return Math.floor(Math.random() * 300);

  return Number(lvl[1]);
}

function parseMeta(meta: string) {
  const parsed = parse(`<div>${meta}</div>`);

  const name = parsed.querySelector("b")?.textContent ?? "Unknown";
  const type = parsed.querySelector("i")?.textContent ?? "unknown";
  const locationText = parsed
    .querySelector("div div")
    ?.textContent.replace(/\((.*?)\)/, "")
    .trim();
  const lvl = getNpcLevelFromMeta(meta);

  return {
    name,
    type,
    location: locationText,
    lvl,
  };
}

async function scrapeNpcsByType(npcType: string): Promise<ScrapedNpc[]> {
  const url = `${BASE_URL}${npcType}`;

  try {
    console.log(`Scraping NPCs of type: ${npcType}...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${npcType}: ${response.statusText}`);
    }

    const html = await response.text();
    const parsed = parse(html);

    const npcs: ScrapedNpc[] = [];

    for (const npcElement of parsed.querySelectorAll("table tr")) {
      try {
        const img = npcElement.querySelector("td .npc");
        const icon = img?.getAttribute("src")?.replace(URL_MATCH, "") ?? "";
        const meta = parseMeta(img?.getAttribute("data-tip") ?? "");

        const idHref = npcElement.querySelector("td a")?.getAttribute("href");
        const id = idHref?.split("/")[3];

        if (!id || !meta.lvl) {
          continue;
        }

        npcs.push({
          icon,
          id: Number(id),
          prof: getRandomProfession(),
          hpp: 0,
          type: 2,
          wt: getWtByType(meta.type),
          lvl: meta.lvl,
          name: meta.name,
          location: meta.location,
        });
      } catch (error) {
        console.warn(`Failed to parse NPC in ${npcType}:`, error);
      }
    }

    console.log(`Scraped ${npcs.length} NPCs of type ${npcType}`);
    return npcs;
  } catch (error) {
    console.error(`Error scraping NPCs of type ${npcType}:`, error);
    return [];
  }
}

export async function scrapeNpcs(
  outputPath?: string,
  force = false,
): Promise<ScrapedNpc[]> {
  if (outputPath && !force) {
    const fullPath = path.resolve(outputPath);
    const exists = await fileExists(fullPath);

    if (exists) {
      console.log(`⏭️  NPCs file already exists at ${fullPath}`);
      console.log("💡 Use --force flag to re-scrape");

      const existingData = await readFile(fullPath, "utf-8");
      return JSON.parse(existingData);
    }
  }

  console.log("Starting NPCs scraping...");

  const npcs: ScrapedNpc[] = [];

  for (const npcType of SCRAPER_CONFIG.npcTypes) {
    const typeNpcs = await scrapeNpcsByType(npcType);
    npcs.push(...typeNpcs);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`Scraped ${npcs.length} NPCs successfully`);

  if (outputPath) {
    const fullPath = path.resolve(outputPath);
    await writeFile(fullPath, JSON.stringify(npcs, null, 2));
    console.log(`NPCs saved to ${fullPath}`);
  }

  return npcs;
}
