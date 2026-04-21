export const roundValue = (value: string | number): string => {
  let strValue = typeof value === "string" ? value : String(value);

  strValue = strValue.replace(",", ".");

  const numValue = Number.parseFloat(strValue);

  if (Number.isNaN(numValue)) {
    return typeof value === "string" ? value : String(value);
  }

  return Math.round(numValue).toString();
};

export const roundHpPercentage = (
  value: string | number | null | undefined,
): string => {
  if (value == null) {
    return "-";
  }

  const strValue = String(value);
  const hasPercent = strValue.includes("%");
  const numericValue = strValue.replace("%", "");
  const rounded = roundValue(numericValue);

  return hasPercent ? rounded + "%" : rounded;
};

export const transformAndRoundEnergyMana = (value: string): string => {
  const strValue = value.replace(",", ".");
  const numValue = Number.parseFloat(strValue);
  if (Number.isNaN(numValue)) return value;

  return Math.round(numValue * -1).toString();
};

export const processDamageValue = (
  value: string,
  prefix: string = "",
): string => {
  const rounded = roundValue(value);
  return prefix + rounded;
};
