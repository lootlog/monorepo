"use client";

import { cn } from "@lootlog/ui/lib/utils";
import { motion } from "framer-motion";

interface BentoCardProps {
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
  visual?: React.ReactNode;
  image?: string;
}

function BentoCard({
  title,
  description,
  className,
  children,
  visual,
  image,
}: BentoCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 p-6 flex flex-col h-full">
        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-[90%]">
          {description}
        </p>

        <div className="mt-auto w-full rounded-xl overflow-hidden bg-black/20 border border-white/5 relative group-hover:scale-[1.02] transition-transform duration-500">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-auto object-cover"
            />
          ) : (
            visual
          )}
        </div>

        {children}
      </div>
    </motion.div>
  );
}

// Mini-UI Components
const TimersVisual = () => (
  <div className="flex h-full w-full bg-[#0a0a0a] p-4 flex-col gap-3 font-sans relative overflow-hidden">
    {/* Header Simulation */}
    <div className="flex items-center justify-between mb-1 opacity-50">
      <div className="h-1.5 w-16 bg-white/20 rounded-full" />
      <div className="h-1.5 w-8 bg-white/20 rounded-full" />
    </div>

    {/* Timer Row 1 */}
    <div className="flex items-center justify-between bg-white/5 p-2.5 rounded border border-white/10 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-3 relative z-10">
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-red-500"
        />
        <span className="text-xs font-medium text-gray-300">Tytan</span>
      </div>
      <span className="text-sm font-mono font-bold text-red-500 relative z-10">
        12:30
      </span>
    </div>

    {/* Timer Row 2 */}
    <div className="flex items-center justify-between bg-white/5 p-2.5 rounded border border-white/10 relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span className="text-xs font-medium text-gray-300">Heros</span>
      </div>
      <span className="text-sm font-mono font-bold text-orange-500">04:20</span>
    </div>

    {/* Timer Row 3 */}
    <div className="flex items-center justify-between bg-white/5 p-2.5 rounded border border-white/10 opacity-60">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        <span className="text-xs font-medium text-gray-300">E2</span>
      </div>
      <span className="text-sm font-mono font-bold text-purple-500">00:45</span>
    </div>
  </div>
);

const LootVisual = () => (
  <div className="flex h-full w-full bg-[#0a0a0a] p-3 gap-3 overflow-hidden font-sans">
    {/* Main Content - Loot Grid */}
    <div className="flex-1 space-y-3">
      {/* Search Bar Simulation */}
      <div className="h-8 bg-white/5 rounded-md border border-white/10 flex items-center px-3 gap-2">
        <div className="w-3 h-3 rounded-full border border-white/20" />
        <div className="h-1.5 w-24 bg-white/10 rounded-full" />
      </div>

      {/* Loot Card 1 */}
      <div className="bg-white/5 rounded-md border border-white/10 p-3 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-gray-300">
              Piekielny Kościej (85w)
            </div>
            <div className="inline-flex px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] text-red-400 font-bold uppercase tracking-wider">
              Heros
            </div>
          </div>
          <div className="text-[8px] text-gray-600">10m</div>
        </div>

        {/* Players */}
        <div className="flex -space-x-1.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full bg-zinc-800 border-2 border-[#0a0a0a]"
            />
          ))}
        </div>

        {/* Items */}
        <div className="flex gap-1.5 pt-1">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-7 h-7 rounded bg-zinc-900 border border-orange-500/50 shadow-[0_0_10px_-3px_rgba(249,115,22,0.4)] relative group"
          >
            <div className="absolute inset-0 bg-orange-500/10" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="w-7 h-7 rounded bg-zinc-900 border border-blue-500/50 shadow-[0_0_10px_-3px_rgba(59,130,246,0.4)] relative"
          >
            <div className="absolute inset-0 bg-blue-500/10" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="w-7 h-7 rounded bg-zinc-900 border border-yellow-500/50 shadow-[0_0_10px_-3px_rgba(234,179,8,0.4)] relative"
          >
            <div className="absolute inset-0 bg-yellow-500/10" />
          </motion.div>
        </div>
      </div>

      {/* Loot Card 2 (Partial) */}
      <div className="bg-white/5 rounded-md border border-white/10 p-3 space-y-2 opacity-40">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-bold text-gray-300">
              Święty Braciszek (123b)
            </div>
            <div className="inline-flex px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[8px] text-red-400 font-bold uppercase tracking-wider">
              Heros
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Sidebar - Filters */}
    <div className="w-28 bg-white/5 rounded-md border border-white/10 p-3 space-y-4 hidden sm:block">
      <div className="flex items-center justify-between">
        <div className="h-2 w-12 bg-white/20 rounded-full" />
        <div className="w-3 h-3 bg-primary/20 rounded border border-primary/30" />
      </div>

      {/* Filter Group */}
      <div className="space-y-2">
        <div className="h-1.5 w-10 bg-white/10 rounded-full" />
        <div className="flex gap-1.5 flex-wrap">
          <div className="h-4 w-full bg-purple-500/10 border border-purple-500/30 rounded text-[8px] text-purple-400 flex items-center px-1.5">
            Legendarny
          </div>
          <div className="h-4 w-full bg-red-500/10 border border-red-500/30 rounded text-[8px] text-red-400 flex items-center px-1.5">
            Heros
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2 pt-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-[2px] border border-white/20" />
            <div className="h-1.5 w-12 bg-white/10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const NotificationVisual = () => (
  <div className="flex h-full w-full bg-[#0a0a0a] p-4 flex-col gap-3 font-sans relative">
    {/* Notification 1 */}
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-zinc-900/90 border border-green-500/20 p-3 rounded-lg shadow-lg flex gap-3 items-start transform translate-x-2"
    >
      <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-green-400 uppercase tracking-wide">
          Respawn
        </div>
        <div className="text-xs text-gray-300 leading-tight">
          <span className="text-white font-medium">Tytan</span> odrodził się na
          mapie!
        </div>
      </div>
    </motion.div>

    {/* Notification 2 */}
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 0.6 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-zinc-900/90 border border-blue-500/20 p-3 rounded-lg shadow-lg flex gap-3 items-start transform scale-95 origin-top-left"
    >
      <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
          Aukcja
        </div>
        <div className="text-xs text-gray-400 leading-tight">
          Twoja oferta została przebita.
        </div>
      </div>
    </motion.div>
  </div>
);

const ChatVisual = () => (
  <div className="flex h-full w-full bg-[#0a0a0a] p-4 flex-col justify-end gap-3 font-sans">
    {/* Message 1 */}
    <div className="flex gap-2 items-end">
      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[8px] text-indigo-300 font-bold">
        K
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none px-3 py-2 max-w-[80%]"
      >
        <div className="text-[10px] text-gray-300">
          Ktoś na E2? Zaraz respi.
        </div>
      </motion.div>
    </div>

    {/* Message 2 */}
    <div className="flex gap-2 items-end flex-row-reverse">
      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] text-primary font-bold">
        T
      </div>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-primary/10 border border-primary/20 rounded-2xl rounded-br-none px-3 py-2 max-w-[80%]"
      >
        <div className="text-[10px] text-primary-foreground">
          Już biegnę, trzymajcie!
        </div>
      </motion.div>
    </div>

    {/* Input Simulation */}
    <div className="mt-2 h-8 bg-white/5 rounded-full border border-white/10 flex items-center px-3 justify-between">
      <div className="h-1.5 w-24 bg-white/10 rounded-full" />
      <div className="w-4 h-4 rounded-full bg-primary/20" />
    </div>
  </div>
);

const BattleVisual = () => (
  <div className="relative h-32 flex items-end justify-between px-4 pb-4 gap-2">
    {[40, 70, 50, 90, 60, 80, 45].map((h, i) => (
      <div
        key={i}
        className="w-full bg-primary/20 rounded-t-sm relative group/bar"
      >
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-primary"
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 1, delay: i * 0.1 }}
        />
      </div>
    ))}
    <div className="absolute top-2 right-2 text-[10px] text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
      DPS: 12.4k
    </div>
  </div>
);

const ReservationVisual = () => (
  <div className="p-4 grid grid-cols-3 gap-2">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className={cn(
          "aspect-square rounded-md border flex items-center justify-center text-[10px]",
          i === 1
            ? "bg-red-500/20 border-red-500/30 text-red-500"
            : i === 4
              ? "bg-green-500/20 border-green-500/30 text-green-500"
              : "bg-white/5 border-white/5 text-muted-foreground",
        )}
      >
        {i === 1 ? "Zajęte" : i === 4 ? "Ty" : "Wolne"}
      </div>
    ))}
  </div>
);

export function BentoFeatures() {
  return (
    <div className="py-24">
      <div className="text-center mb-20 space-y-4">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">
          Narzędzia dla <span className="text-primary">Profesjonalistów</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Zbudowane przez graczy, dla graczy. Każdy piksel ma znaczenie.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto px-4 auto-rows-[200px]">
        {/* Timers - Tall */}
        <BentoCard
          title="Synchronizacja Timerów"
          description="Wspólne odliczanie dla całego klanu."
          className="md:col-span-1 md:row-span-2"
          visual={<TimersVisual />}
        />

        {/* Loot - Wide */}
        <BentoCard
          title="Lootlog z Filtrami"
          description="Zaawansowane filtrowanie łupów."
          className="md:col-span-2 md:row-span-1"
          visual={<LootVisual />}
        />

        {/* Notifications - Standard */}
        <BentoCard
          title="Powiadomienia"
          description="Bądź zawsze na bieżąco."
          className="md:col-span-1 md:row-span-1"
          visual={<NotificationVisual />}
        />

        {/* Battles - Standard */}
        <BentoCard
          title="Analiza Walk"
          description="Wykresy, statystyki, wnioski."
          className="md:col-span-1 md:row-span-1"
          visual={<BattleVisual />}
        />

        {/* Chat - Wide */}
        <BentoCard
          title="Czat Zintegrowany"
          description="Komunikacja bez wychodzenia z gry."
          className="md:col-span-2 md:row-span-1"
          visual={<ChatVisual />}
        />

        {/* Reservations - Standard */}
        <BentoCard
          title="System Rezerwacji"
          description="Koniec z kłótniami o respy."
          className="md:col-span-1 md:row-span-1"
          visual={<ReservationVisual />}
        />
      </div>
    </div>
  );
}
