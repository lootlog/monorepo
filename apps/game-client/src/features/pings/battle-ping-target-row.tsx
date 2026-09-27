import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { battlePingStore } from "./battle-ping-store";
import { PingBadge } from "./ping-badge";
import { getPingPresentation } from "./ping-presentation";

type BattlePingTargetRowProps = {
  ago: string;
  /** The sender's name, or null when the local hero picked the target. */
  sender: string | null;
  target: string;
  warriorId: number;
};

/** The team's shared attack target, pinned above the fight's history. */
export const BattlePingTargetRow: FC<BattlePingTargetRowProps> = ({
  ago,
  sender,
  target,
  warriorId,
}) => {
  const { t } = useTranslation("pings");
  const attack = getPingPresentation("attack");

  return (
    <div
      className="ll:flex ll:items-center ll:gap-2 ll:rounded-md ll:border ll:border-red-400/35 ll:bg-red-500/10 ll:px-2 ll:py-1.5"
      onMouseEnter={() => battlePingStore.highlightWarrior(warriorId)}
      onMouseLeave={() => battlePingStore.highlightWarrior(null)}
    >
      <PingBadge icon={attack.icon} size={20} tone={attack.tone} />
      <span className="ll:flex ll:min-w-0 ll:flex-col ll:leading-tight">
        <span className="ll:truncate ll:text-xs ll:font-semibold ll:text-gray-100">
          {target}
        </span>
        <span className="ll:truncate ll:text-[11px] ll:text-muted-foreground">
          {sender === null
            ? t("battle.markedByYou")
            : t("battle.markedBy", { sender })}{" "}
          · {ago}
        </span>
      </span>
    </div>
  );
};
