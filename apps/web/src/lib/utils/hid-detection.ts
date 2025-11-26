export const ITEM_HID_PATTERN = /^ITEM#(.+)\.(\w+)$/;

export const isItemHid = (value: string): boolean => {
  return ITEM_HID_PATTERN.test(value.trim());
};

export const parseItemHid = (
  value: string,
): { hid: string; world: string } | null => {
  const match = value.trim().match(ITEM_HID_PATTERN);
  if (!match || !match[1] || !match[2]) return null;
  return { hid: match[1], world: match[2] };
};

export const formatItemHid = (hid: string, world: string): string => {
  return `ITEM#${hid}.${world}`;
};
