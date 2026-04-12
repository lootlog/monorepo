import { motion, useReducedMotion } from "framer-motion";
import type { EventWrappedLeader } from "../../../types/api";
import { formatMetric } from "./utils";

interface LeaderCardProps {
  title: string;
  leader: EventWrappedLeader | null;
  suffix?: string;
  extra?: string;
  value?: string;
}

export const LeaderCard = ({
  title,
  leader,
  suffix,
  extra,
  value,
}: LeaderCardProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.18 }
          : {
              duration: 0.28,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className="rounded-3xl border border-border/70 bg-background/70 px-4 py-4 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      {leader ? (
        <>
          <p className="mt-3 text-lg font-semibold leading-tight">
            {leader.name}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none">
            {value ?? formatMetric(leader.primaryValue)}
            {suffix ? (
              <span className="ml-1 text-base text-muted-foreground">
                {suffix}
              </span>
            ) : null}
          </p>
          {extra ? (
            <p className="mt-2 text-sm text-muted-foreground">{extra}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">-</p>
      )}
    </motion.div>
  );
};
