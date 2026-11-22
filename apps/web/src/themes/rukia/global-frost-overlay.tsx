import * as m from "framer-motion/m";
import { FrostFilter } from "./frost-filter";
import { WindStreaks } from "./wind-streaks";
import { FrostMist } from "./frost-mist";
import { IceSparkles } from "./ice-sparkles";
import { FrostPatches } from "./frost-patches";
import { FloatingSnowflakes } from "./floating-snowflakes";

export const GlobalFrostOverlay = () => (
  <m.div
    className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 2, ease: "easeOut" }}
  >
    <FrostFilter />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(200, 230, 255, 0.06) 0%, transparent 5%), " +
          "linear-gradient(0deg, rgba(200, 230, 255, 0.06) 0%, transparent 5%), " +
          "linear-gradient(90deg, rgba(200, 230, 255, 0.04) 0%, transparent 3%), " +
          "linear-gradient(270deg, rgba(200, 230, 255, 0.04) 0%, transparent 3%)",
      }}
    />

    <FrostPatches />

    <WindStreaks />

    <FrostMist />

    <IceSparkles />

    <FloatingSnowflakes />
  </m.div>
);
