export const roundValue = (value: string | number): string => {
  let strValue = typeof value === "string" ? value : String(value);

  strValue = strValue.replace(",", ".");

  const numValue = parseFloat(strValue);

  if (isNaN(numValue)) {
    return typeof value === "string" ? value : String(value);
  }

  return Math.round(numValue).toString();
};

const isCommaSeparatedValues = (value: string): boolean => {
  const parts = value.split(",");
  if (parts.length <= 1) return false;

  if (parts.length > 2) return true;

  if (parts.length === 2) {
    const secondPart = parts?.[1]?.trim() ?? "";
    return secondPart.length > 3 || !secondPart.match(/^\d{1,3}$/);
  }

  return false;
};

export const roundCommaSeparatedValues = (value: string): string => {
  if (!isCommaSeparatedValues(value)) {
    return roundValue(value);
  }

  return value
    .split(",")
    .map((val) => roundValue(val.trim()))
    .join(",");
};

export const roundValueWithSign = (value: string): string => {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const hasMinus = trimmed.startsWith("-");

  if (hasPlus || hasMinus) {
    const numericPart = trimmed.slice(1);
    const rounded = roundValue(numericPart);
    return (hasPlus ? "+" : "-") + rounded;
  }

  return roundValue(trimmed);
};

export const roundHpPercentage = (value: string | number): string => {
  const strValue = String(value);
  const hasPercent = strValue.includes("%");
  const numericValue = strValue.replace("%", "");
  const rounded = roundValue(numericValue);

  return hasPercent ? rounded + "%" : rounded;
};

export const transformAndRoundEnergyMana = (value: string): string => {
  const strValue = value.replace(",", ".");
  const numValue = parseFloat(strValue);
  if (isNaN(numValue)) return value;

  return Math.round(numValue * -1).toString();
};

export const processDamageValue = (
  value: string,
  prefix: string = ""
): string => {
  const rounded = roundValue(value);
  return prefix + rounded;
};
