import { Check, Gem, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const spawnDelay = 42 * 60 + 18;

export function TimerIllustration() {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(spawnDelay);

  useEffect(() => {
    const deadline = Date.now() + spawnDelay * 1000;

    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <figure className="landing-timer">
      <div className="landing-sticker landing-timer-card">
        <div className="landing-timer-head">
          <p className="landing-timer-name">
            {t("landing.illustrations.opponent")}
          </p>
          <Swords className="landing-timer-icon" aria-hidden="true" />
        </div>
        <p role="timer" aria-live="off" className="landing-timer-clock">
          {`00:${minutes}:${seconds.slice(0, 1)}`}
          <span key={remaining} className="landing-timer-second">
            {seconds.slice(1)}
          </span>
        </p>
        <div aria-hidden="true" className="landing-timer-bar">
          <div
            className="landing-timer-bar-fill"
            style={{ width: `${(remaining / (60 * 60)) * 100}%` }}
          />
        </div>
      </div>
      <div className="landing-sticker landing-timer-toast">
        <span className="landing-timer-toast-icon">
          <Gem aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="landing-timer-toast-label">
            {t("landing.illustrations.loot")}
          </p>
          <p className="landing-timer-toast-title">
            {t("landing.illustrations.items.gem")}
          </p>
        </div>
        <Check
          className="landing-timer-toast-check size-5 shrink-0"
          aria-hidden="true"
        />
      </div>
      <figcaption className="landing-caption">
        {t("landing.illustrations.example")}
      </figcaption>
    </figure>
  );
}
