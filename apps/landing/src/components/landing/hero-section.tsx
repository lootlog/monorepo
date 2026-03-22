"use client";

import { Download, BookOpen, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ADDON_URL } from "@/src/config/addon";
import { links } from "@/src/config/links";
import { motion } from "framer-motion";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <div className="relative z-10 flex flex-col items-center text-center">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"
      />

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground leading-[1.1] mb-6"
      >
        {t("landing.hero.titleLine1")} <br />
        <motion.span
          className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-[size:200%_auto]"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          {t("landing.hero.titleLine2")}
        </motion.span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-10"
      >
        {t("landing.hero.subtitle")}
        <br className="hidden md:block" />
        &nbsp; {t("landing.hero.subtitleLine2")}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button
          size="lg"
          className="h-14 px-8 text-lg shadow-[0_0_30px_-8px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_50px_-10px_hsl(var(--primary)/0.7)] transition-all duration-300 hover:scale-[1.03]"
          asChild
        >
          <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
            <Download className="w-5 h-5 mr-2" />
            {t("landing.hero.installAddon")}
          </a>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 px-8 text-lg border-white/10 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:border-white/20"
          asChild
        >
          <a href={links.docs}>
            <BookOpen className="w-5 h-5 mr-2" />
            {t("landing.hero.docs")}
            <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
          </a>
        </Button>
      </motion.div>
    </div>
  );
}
