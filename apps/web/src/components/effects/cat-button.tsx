import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

const PAW_SVG_PATH =
  "M16 21c-3.59 0-6.5-2.24-6.5-5s2.91-5 6.5-5 6.5 2.24 6.5 5-2.91 5-6.5 5zM7 14a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-4a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6zm6 0a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6zm6 4a3 3 0 1 1 0-6 3 3 0 0 1 0 6z";

export const CatButton = ({
  children,
  isHovered,
  isActive,
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
}) => {
  const showEffects = isHovered || isActive;

  return (
    <div className="relative overflow-hidden rounded-md flex flex-col">
      <AnimatePresence>
        {showEffects && (
          <>
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-md"
              style={{
                background:
                  "radial-gradient(ellipse at center, oklch(var(--primary) / 0.12) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute inset-0 rounded-md pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                boxShadow:
                  "inset 0 0 8px 1px oklch(var(--primary) / 0.2), 0 0 8px 1px oklch(var(--primary) / 0.1)",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute right-1 top-1/2 pointer-events-none"
              initial={{ opacity: 0, scale: 0.6, y: "-50%" }}
              animate={{ opacity: 0.4, scale: 1, y: "-50%" }}
              exit={{ opacity: 0, scale: 0.6, y: "-50%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 32 32"
                className="fill-current text-primary"
              >
                <path d={PAW_SVG_PATH} />
              </svg>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};
