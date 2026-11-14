/** Every aura made as a kit, by the name a preset gives in `kit`. */
import type { AuraKitId } from "../presets";
import { fortyfour } from "./fortyfour";
import { joker } from "./joker";
import type { AuraKit } from "./kit";
import { nightowl } from "./nightowl";
import { ninepins } from "./ninepins";
import { skyborne } from "./skyborne";
import { sunder } from "./sunder";
import { thirteenth } from "./thirteenth";
import { threefaces } from "./threefaces";

export const KITS: Record<AuraKitId, AuraKit> = {
  skyborne,
  joker,
  nightowl,
  sunder,
  fortyfour,
  thirteenth,
  ninepins,
  threefaces,
};
