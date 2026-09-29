const ITEM_HID_PATTERN = /^ITEM#(.+)\.(\w+)$/;

export const parseItemHid = (
  value: string,
): { hid: string; world: string } | null => {
  const match = value.trim().match(ITEM_HID_PATTERN);
  const [, hid, world] = match ?? [];

  if (!hid || !world) {
    return null;
  }

  return { hid, world };
};

export const formatItemHid = (hid: string, world: string): string => {
  return `ITEM#${hid}.${world}`;
};
