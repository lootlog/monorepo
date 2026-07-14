import type { EventModeResponseDtoEventsItemNextRespawn } from "@/lib/api/generated/main/model/event-mode-response-dto-events-item-next-respawn";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getRespawnDisplay } from "./event-mode.helpers";

interface EventModeRespawnProps {
  respawn: EventModeResponseDtoEventsItemNextRespawn;
  nowMs: number;
}

export const EventModeRespawn = ({ respawn, nowMs }: EventModeRespawnProps) => {
  const { t } = useTranslation("eventMode");
  const display = getRespawnDisplay(respawn, nowMs);

  return (
    <section
      aria-label={t("respawn.title")}
      className="ll:rounded-md ll:border ll:border-white/10 ll:bg-black/25 ll:px-2 ll:py-1.5"
    >
      <div className="ll:mb-1 ll:flex ll:items-center ll:gap-1 ll:text-[9px] ll:font-semibold ll:uppercase ll:tracking-[0.12em] ll:text-sky-200/70">
        <Clock3 size={10} aria-hidden="true" />
        <span>{t("respawn.title")}</span>
      </div>
      {respawn && display.state !== "missing" ? (
        <div className="ll:flex ll:min-w-0 ll:items-center ll:justify-between ll:gap-2">
          <p className="ll:truncate ll:text-[12px] ll:font-semibold ll:text-gray-100">
            {respawn.npcName}
          </p>
          <span className={getRespawnClassName(display.state)}>
            {t(`respawn.state.${display.state}`, {
              time: parseMsToTime(display.durationMs),
            })}
          </span>
        </div>
      ) : (
        <p className="ll:text-[11px] ll:text-gray-400">
          {t("respawn.missing")}
        </p>
      )}
    </section>
  );
};

function getRespawnClassName(state: "waiting" | "open" | "overdue") {
  const baseClassName =
    "ll:shrink-0 ll:rounded ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:font-semibold ll:tabular-nums";

  if (state === "open") {
    return `${baseClassName} ll:bg-emerald-400/10 ll:text-emerald-300`;
  }

  if (state === "overdue") {
    return `${baseClassName} ll:bg-red-400/10 ll:text-red-300`;
  }

  return `${baseClassName} ll:bg-sky-400/10 ll:text-sky-300`;
}
