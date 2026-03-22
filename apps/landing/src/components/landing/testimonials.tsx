"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
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
      className="group flex flex-col p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm hover:bg-white/[0.07] transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/20"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <Image
            src={avatar}
            alt={name}
            width={48}
            height={48}
            unoptimized
            className="relative h-12 w-12 rounded-full border-2 border-primary/30 object-cover"
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
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <TestimonialCard
        index={0}
        name={t("landing.testimonials.kamil.name")}
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=202020"
        role={t("landing.testimonials.kamil.role")}
        desc={t("landing.testimonials.kamil.quote")}
      />
      <TestimonialCard
        index={1}
        name={t("landing.testimonials.anna.name")}
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=202020"
        role={t("landing.testimonials.anna.role")}
        desc={t("landing.testimonials.anna.quote")}
      />
      <TestimonialCard
        index={2}
        name={t("landing.testimonials.marek.name")}
        avatar="https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=202020"
        role={t("landing.testimonials.marek.role")}
        desc={t("landing.testimonials.marek.quote")}
      />
    </div>
  );
}
