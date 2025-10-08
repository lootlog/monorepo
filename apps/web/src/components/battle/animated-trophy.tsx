import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { FC } from "react";

export type AnimatedTrophyProps = {
  show: boolean;
  isUserTeamWinner: boolean;
};

export const AnimatedTrophy: FC<AnimatedTrophyProps> = ({
  show,
  isUserTeamWinner,
}) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      }}
    >
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <Trophy
          size={40}
          className={cn("", {
            "text-destructive": !isUserTeamWinner,
            "text-green-500": isUserTeamWinner,
          })}
        />
      </motion.div>
    </motion.div>
  );
};
