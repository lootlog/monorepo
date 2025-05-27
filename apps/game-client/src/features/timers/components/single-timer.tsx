import { Timer, useTimers } from "@/hooks/api/use-timers";
import { cn } from "@/lib/utils";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { format, parse } from "date-fns";
import { FC, useEffect, useState } from "react";

type SingleTimerProps = {
  timer: Timer;
  guildId?: string;
};

const NPC_NAMES: { [key: string]: { shortname: string; longname: string } } = {
  TITAN: {
    shortname: "T",
    longname: "tytan",
  },
  COLOSSUS: {
    shortname: "K",
    longname: "kolos",
  },
  HERO: {
    shortname: "H",
    longname: "heros",
  },
  ELITE3: {
    shortname: "E3",
    longname: "elita III",
  },
  ELITE2: {
    shortname: "E2",
    longname: "elita II",
  },
  ELITE: {
    shortname: "E",
    longname: "elita",
  },
};

const THRESHOLD = 30000;

export const SingleTimer: FC<SingleTimerProps> = ({ timer, guildId }) => {
  const maxSpawnTime = new Date(timer.maxSpawnTime).getTime();
  const minSpawnTime = new Date(timer.minSpawnTime).getTime();

  const { refetch } = useTimers({ guildId });
  const [timeLeft, setTimeLeft] = useState(maxSpawnTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const time = maxSpawnTime - Date.now();

      if (time <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        refetch();

        return;
      }

      setTimeLeft(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [maxSpawnTime, refetch]);

  const isMinSpawnTime = minSpawnTime - Date.now() < 0;
  const hasPassedRedThreshold = timeLeft < THRESHOLD;

  useEffect(() => {
    // @ts-ignore
    $(`#${timer.npc.id}`).tip(
      `<span className="elite_timer_tip_name">
         <b>${timer.npc.name}</b>
      </span>
      <i>${NPC_NAMES[timer.npc.type].longname}</i>
      <br />
      <span className="elite_timer_tip_date">
       Max: ${format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
        </span>
        <br />
        <span className="elite_timer_tip_date">
       Min: ${format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
        </span>
      `
    );
  }, []);

  return (
    <div
      className={cn("row tw-list-item do-action-cursor", {
        short: isMinSpawnTime,
        pass: hasPassedRedThreshold,
      })}
      id={timer.npc.id.toString()}
    >
      <div className="col">
        <div className="name cell">
          <div className="name-val">
            [{NPC_NAMES[timer.npc.type].shortname}] {timer.npc.name}
          </div>
        </div>
      </div>

      <div className="col">
        <div className="time cell">
          <div className="time-val">{parseMsToTime(timeLeft)}</div>
        </div>
      </div>
    </div>
  );
};
