"use client";

import { Download, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ADDON_URL } from "@/src/config/addon";
import { motion } from "framer-motion";

export function HeroSection() {
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
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none"
      />

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground leading-[1.1] mb-6"
      >
        Przejmij kontrolę nad <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500 animate-gradient-x">
          Lootami i Timerami
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed mb-10"
      >
        Lootlog to Twoje centrum dowodzenia w Margonem.
        <br className="hidden md:block" />
        &nbsp; Synchronizowane timery, historia łupów i analiza walk.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button
          size="lg"
          className="h-14 px-8 text-lg rounded-full shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_-15px_hsl(var(--primary)/0.6)] transition-all duration-300 hover:scale-105"
          asChild
        >
          <a href={ADDON_URL} target="_blank" rel="noopener noreferrer">
            <Download className="w-5 h-5 mr-2" />
            Zainstaluj Dodatek
          </a>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          asChild
        >
          <a href="https://developer.lootlog.pl">
            <BookOpen className="w-5 h-5 mr-2" />
            Dokumentacja
            <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
          </a>
        </Button>
      </motion.div>
    </div>
  );
}
