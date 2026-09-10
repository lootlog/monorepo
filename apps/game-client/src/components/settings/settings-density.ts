import type { CSSProperties } from "react";

/**
 * Sizing tokens shared by every settings primitive, mirroring the chat
 * density variables so both windows read as one system.
 */
export type SettingsDensityStyle = CSSProperties & {
  "--ll-settings-control-height": string;
  "--ll-settings-font-size": string;
  "--ll-settings-label-font-size": string;
  "--ll-settings-line-height": string;
  "--ll-settings-meta-font-size": string;
  "--ll-settings-meta-line-height": string;
  "--ll-settings-space-xl": string;
  "--ll-settings-space-lg": string;
  "--ll-settings-space-md": string;
  "--ll-settings-space-sm": string;
  "--ll-settings-space-xs": string;
};

export const SETTINGS_DENSITY_STYLE: SettingsDensityStyle = {
  "--ll-settings-control-height": "24px",
  "--ll-settings-font-size": "12px",
  "--ll-settings-label-font-size": "10px",
  "--ll-settings-line-height": "16px",
  "--ll-settings-meta-font-size": "11px",
  "--ll-settings-meta-line-height": "14px",
  "--ll-settings-space-xl": "24px",
  "--ll-settings-space-lg": "8px",
  "--ll-settings-space-md": "6px",
  "--ll-settings-space-sm": "4px",
  "--ll-settings-space-xs": "2px",
};

/** Window width below which the domain list collapses to an icon rail. */
export const SETTINGS_COMPACT_WIDTH = 600;
