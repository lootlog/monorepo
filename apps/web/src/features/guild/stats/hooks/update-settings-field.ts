export const updateSettingsField = <Settings, Key extends keyof Settings>(
  settings: Settings,
  key: Key,
  value: Settings[Key],
): Settings =>
  settings[key] === value ? settings : { ...settings, [key]: value };
