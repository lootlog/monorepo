type PlatformNavigator = Pick<Navigator, "platform" | "userAgent"> & {
  userAgentData?: {
    platform?: string;
  };
};

export const getPrimaryModifierKeyLabel = (
  platformNavigator: PlatformNavigator | undefined = typeof navigator ===
  "undefined"
    ? undefined
    : (navigator as PlatformNavigator),
): "Ctrl" | "⌘" => {
  if (!platformNavigator) {
    return "Ctrl";
  }

  const reportedPlatform =
    platformNavigator.userAgentData?.platform ?? platformNavigator.platform;
  const platform = reportedPlatform.trim()
    ? reportedPlatform
    : platformNavigator.userAgent;
  const isApplePlatform = /mac|iphone|ipad|ipod/i.test(platform);

  return isApplePlatform ? "⌘" : "Ctrl";
};
