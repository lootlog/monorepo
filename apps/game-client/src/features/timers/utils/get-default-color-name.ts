import { getFixedT } from "@/i18n/get-fixed-t";

export const getDefaultColorName = (
  colorId: string,
  legacyAppearance = false,
) => {
  const t = getFixedT("timers");

  return t(
    `colorNames.${legacyAppearance && colorId === "white" ? "gray" : colorId}`,
    { defaultValue: colorId },
  );
};
