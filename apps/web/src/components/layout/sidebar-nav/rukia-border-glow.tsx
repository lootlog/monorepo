import {
  FrostFilter,
  ScatteredCrystal,
  Snowflake,
  IceCracks,
  buttonCrystalPositions,
  buttonSnowflakePositions,
} from "@/components/effects/rukia-frost";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export const RukiaBorderGlow = ({
  children,
  isHovered,
  isActive,
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
}) => {
  const isFrozen = isHovered || isActive;

  return (
    <div className="relative overflow-hidden rounded-md">
      <FrostFilter />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#frost-noise)",
            background: "white",
          }}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.25) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 70% 80%, rgba(200, 230, 255, 0.2) 0%, transparent 50%), " +
            "linear-gradient(135deg, rgba(220, 240, 255, 0.15) 0%, rgba(200, 230, 255, 0.1) 50%, rgba(220, 240, 255, 0.15) 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, transparent 40%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.2) 0%, transparent 40%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%)",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isFrozen ? 1 : 0.8, opacity: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.div>

      <IceCracks isVisible={isFrozen} />

      {buttonCrystalPositions.map((crystal, index) => (
        <ScatteredCrystal
          key={index}
          x={crystal.x}
          y={crystal.y}
          size={crystal.size}
          rotation={crystal.rotation}
          isVisible={isFrozen}
          delay={crystal.delay}
        />
      ))}

      {buttonSnowflakePositions.map((snowflake, index) => (
        <Snowflake
          key={index}
          x={snowflake.x}
          y={snowflake.y}
          size={snowflake.size}
          isVisible={isFrozen}
          delay={snowflake.delay}
        />
      ))}

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          backdropFilter: isFrozen ? "blur(1px)" : "blur(0px)",
          WebkitBackdropFilter: isFrozen ? "blur(1px)" : "blur(0px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFrozen ? 1 : 0,
          boxShadow: isFrozen
            ? "inset 0 0 12px 3px rgba(200, 230, 255, 0.4), 0 0 15px 3px rgba(180, 220, 255, 0.3)"
            : "inset 0 0 0px 0px transparent",
        }}
        transition={{ duration: 0.3 }}
      />

      {isActive && (
        <>
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(220, 240, 255, 0.2) 0%, rgba(200, 230, 255, 0.15) 50%, rgba(220, 240, 255, 0.2) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)",
              }}
              animate={{
                x: ["-200%", "200%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none border-2 border-cyan-200/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        </>
      )}

      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255, 255, 255, 0.7) 0%, rgba(220, 240, 255, 0.4) 30%, transparent 60%)",
          }}
          initial={{ opacity: 1, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
};
