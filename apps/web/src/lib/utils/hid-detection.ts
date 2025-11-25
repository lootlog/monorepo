export const HID_PATTERN = /^[a-z0-9]{64}$/i;

export const isItemHid = (value: string): boolean => {
  return HID_PATTERN.test(value.trim());
};
