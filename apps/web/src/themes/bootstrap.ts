import { isThemePresetId } from "@lootlog/types";
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY } from "./catalog";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
} from "./resolver";
import { PRESET_THEME_CONFIGS } from "./preset-configs";
import {
  applyThemeConfig,
  parseThemeSnapshot,
  THEME_SNAPSHOT_STORAGE_KEY,
} from "./runtime";

const root = document.documentElement;
const snapshot = parseThemeSnapshot(
  localStorage.getItem(THEME_SNAPSHOT_STORAGE_KEY),
);
const legacyTheme = localStorage.getItem(THEME_STORAGE_KEY);
let theme = DEFAULT_THEME_ID;

if (snapshot?.selection?.kind === "preset") {
  theme = snapshot.selection.presetId;
} else if (!snapshot?.selection && isThemePresetId(snapshot?.presetId)) {
  theme = snapshot.presetId;
} else if (!snapshot && isThemePresetId(legacyTheme)) {
  theme = legacyTheme;
}
const resolvedTheme = resolveThemeClass(theme, getRootResolvedTheme(root));

applyThemeClassToRoot({
  root,
  resolvedTheme,
});
applyThemeConfig(root, snapshot?.config ?? PRESET_THEME_CONFIGS[resolvedTheme]);
