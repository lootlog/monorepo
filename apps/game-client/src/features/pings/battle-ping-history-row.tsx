import { ListRow } from "@/components/list-row";
import { cn } from "cn";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { battlePingStore } from "./battle-ping-store";
import { PingBadge } from "./ping-badge";
import {
  PING_TONES,
  type PingIconName,
  type PingTone,
} from "./ping-presentation";

type BattlePingHistoryRowProps = {
  ago: string;
  /** The warrior is dead; its pings no longer apply. */
  dead: boolean;
  /** The ping was addressed to the local hero. */
  forMe: boolean;
  icon: PingIconName;
  label: string;
  /** The ping is still shown on its warrior. */
  onField: boolean;
  sender: string;
  /** Who the ping is about; absent when the sender pinged their own warrior. */
  target: string | null;
  tone: PingTone;
  warriorId: number;
};

/** One ping of the fight: what, from whom, about whom, and how long ago. */
export const BattlePingHistoryRow: FC<BattlePingHistoryRowProps> = ({
  ago,
  dead,
  forMe,
  icon,
  label,
  onField,
  sender,
  target,
  tone,
  warriorId,
}) => {
  const { t } = useTranslation("pings");

  return (
    <li
      className={cn("ll:flex", { "ll:opacity-55": !onField })}
      onMouseEnter={() => battlePingStore.highlightWarrior(warriorId)}
      onMouseLeave={() => battlePingStore.highlightWarrior(null)}
    >
      <ListRow
        className="ll:gap-1.5 ll:py-1 ll:font-normal"
        fill={forMe ? `${PING_TONES.gold.glow}1f` : undefined}
      >
        <PingBadge icon={icon} size={18} tone={tone} />
        <span className="ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:leading-tight">
          <span
            className="ll:truncate ll:text-xs ll:font-semibold"
            style={{ color: PING_TONES[tone].glow }}
          >
            {label}
          </span>
          <span className="ll:truncate ll:text-[11px] ll:text-gray-300">
            <span className="ll:font-semibold ll:text-gray-100">{sender}</span>
            {forMe && target !== null ? (
              <>
                {" → "}
                <span
                  className="ll:font-semibold"
                  style={{ color: PING_TONES.gold.glow }}
                >
                  {t("battle.you")}
                </span>
              </>
            ) : null}
            {!forMe && target !== null ? (
              <>
                {" → "}
                <span className={cn({ "ll:line-through": dead })}>
                  {target}
                </span>
              </>
            ) : null}
            {dead ? ` · ${t("battle.dead")}` : null}
          </span>
        </span>
        <span className="ll:shrink-0 ll:self-start ll:text-[11px] ll:tabular-nums ll:text-muted-foreground">
          {ago}
        </span>
      </ListRow>
    </li>
  );
};
