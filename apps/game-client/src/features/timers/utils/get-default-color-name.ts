import { getFixedT } from "@/i18n/get-fixed-t";

export const getDefaultColorName = (colorId: string) => {
  const t = getFixedT("timers");

  return t(`colorNames.${colorId}`, { defaultValue: colorId });
};
