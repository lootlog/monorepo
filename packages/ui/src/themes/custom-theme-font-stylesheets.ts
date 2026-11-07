import type { CustomThemeFontId } from "@lootlog/schema/custom-theme";
import atkinsonHyperlegible from "@fontsource-variable/atkinson-hyperlegible-next?url";
import ibmPlexSans from "@fontsource-variable/ibm-plex-sans?url";
import inter from "@fontsource-variable/inter?url";
import lexend from "@fontsource-variable/lexend?url";
import monaSans from "@fontsource-variable/mona-sans?url";
import nunito from "@fontsource-variable/nunito?url";
import spaceGrotesk from "@fontsource-variable/space-grotesk?url";

/**
 * Each font's stylesheet as a URL, for a server-rendered page to link the font
 * its theme uses. Geist ships with the shared stylesheet.
 */
export const CUSTOM_THEME_FONT_STYLESHEETS: Record<
  Exclude<CustomThemeFontId, "geist">,
  string
> = {
  "atkinson-hyperlegible": atkinsonHyperlegible,
  "ibm-plex-sans": ibmPlexSans,
  inter,
  lexend,
  "mona-sans": monaSans,
  nunito,
  "space-grotesk": spaceGrotesk,
};
