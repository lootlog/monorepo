"use client";

import { motion } from "framer-motion";

interface TestimonialCardProps {
  role: string;
  desc: string;
  avatar: string;
  name: string;
  index: number;
}

function TestimonialCard({
  role,
  desc,
  avatar,
  name,
  index,
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group flex flex-col p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <img
            src={avatar}
            alt={name}
            className="relative h-12 w-12 rounded-full border-2 border-white/10 object-cover"
          />
        </div>
        <div>
          <div className="font-bold text-foreground">{name}</div>
          <div className="text-xs font-medium uppercase tracking-wider text-primary/80">
            {role}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground leading-relaxed">
        &quot;{desc}&quot;
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TestimonialCard
        index={0}
        name="Kamil"
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=202020"
        role="Lider Klanu"
        desc="To gówno wytwarza jakąś magiczną barierę wokół mojego pokoju, nie mogę się oderwać od Margonem."
      />
      <TestimonialCard
        index={1}
        name="Anna"
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=202020"
        role="Taktyk"
        desc="Analiza walk pokazała, że mag wymaga nerfa, a łowca jest zbyt słaby."
      />
      <TestimonialCard
        index={2}
        name="Marek"
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=202020"
        role="PvP Gracz"
        desc="Wszystko działa jak należy, ale fajnie by było, gdybyście dodali dźwięki powiadomień."
      />
    </div>
  );
}
