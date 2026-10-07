import { useTranslation } from "react-i18next";

const bandItems = [
  "timers",
  "drops",
  "battles",
  "statistics",
  "worlds",
  "openSource",
] as const;

export function FeatureBand() {
  const { t } = useTranslation();

  return (
    <div aria-hidden="true" className="landing-band">
      <div className="landing-band-back" />
      <ul className="landing-band-tape">
        {[...bandItems, ...bandItems].map((key, index) => (
          <li key={`${key}-${index}`}>{t(`landing.band.${key}`)}</li>
        ))}
      </ul>
    </div>
  );
}
