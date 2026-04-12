import { motion } from "framer-motion";
import { Spinner } from "@lootlog/ui/components/spinner";

export const AppStartupLoading = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Spinner className="size-16" />
        </motion.div>
      </motion.div>
    </div>
  );
};
