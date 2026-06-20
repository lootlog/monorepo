import {
  Ban,
  Crosshair,
  EyeOff,
  Flame,
  HeartPulse,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { LegendaryBonusIconKey } from "./battle-hp-timeline-legendary-markers";

export const legendaryBonusIconByType: Record<
  LegendaryBonusIconKey,
  LucideIcon
> = {
  anguish: Flame,
  cleanse: Sparkles,
  critShield: Shield,
  curse: Ban,
  facade: Shield,
  frenzy: Flame,
  glare: EyeOff,
  holyTouch: HeartPulse,
  lastHeal: ShieldCheck,
  legendary: Sparkles,
  puncture: Crosshair,
  retaliation: Shield,
  veryCrit: Zap,
};
