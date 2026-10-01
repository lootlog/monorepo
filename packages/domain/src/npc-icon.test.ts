import { describe, expect, it } from "bun:test";
import { normalizeNpcIcon } from "./npc-icon.js";

describe("NPC icon identity", () => {
  it.each([
    "https://micc.garmory-cdn.cloud/obrazki/npc/hum/gnoll21.gif",
    "http://micc.garmory-cdn.cloud/obrazki/npc/hum/gnoll21.gif",
    "//micc.garmory-cdn.cloud/obrazki/npc/hum/gnoll21.gif",
    "https://micc.garmory-cdn.cloud/obrazki/npc/https://micc.garmory-cdn.cloud/obrazki/npc/hum/gnoll21.gif",
    "https://another-cdn.example/obrazki/npc/hum/gnoll21.gif",
    "/obrazki/npc/hum/gnoll21.gif",
    "/hum/gnoll21.gif",
    "hum/gnoll21.gif",
  ])("names the stored relative graphic for %s", (icon) => {
    expect(normalizeNpcIcon(icon)).toBe("hum/gnoll21.gif");
  });

  it.each([
    "../img/def-npc-sprite.gif",
    "https://micc.garmory-cdn.cloud/obrazki/itemy/mie/miecz.gif",
    "e2/obrazki/npc/a.gif",
  ])("keeps %s, which is not in the NPC image directory", (icon) => {
    expect(normalizeNpcIcon(icon)).toBe(icon);
  });
});
