import { generate } from "random-words";
import crypto from "crypto";
import { SCRAPER_CONFIG } from "../config.js";

export interface GeneratedPlayer {
  originalId: number;
  name: string;
  prof: string;
  icon: string;
  hpp: number;
  lvl: number;
}

export function generatePlayers(count: number): GeneratedPlayer[] {
  const { professions } = SCRAPER_CONFIG;
  const players: GeneratedPlayer[] = [];

  for (let i = 0; i < count; i++) {
    const nicknameWords = crypto.randomInt(1, 4);
    const name = generate(nicknameWords).join(" ");

    players.push({
      originalId: i,
      name,
      prof: professions[crypto.randomInt(0, professions.length)],
      icon: "/noob/hm.gif",
      hpp: crypto.randomInt(0, 101),
      lvl: crypto.randomInt(1, 301),
    });
  }

  return players;
}
