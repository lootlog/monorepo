// Imported first by the entry points: ES modules evaluate their imports in
// order, so this runs before React and the rest of the bundle are evaluated.
import { markBootMilestone } from "@/lib/boot-timing";

markBootMilestone("script-start");
