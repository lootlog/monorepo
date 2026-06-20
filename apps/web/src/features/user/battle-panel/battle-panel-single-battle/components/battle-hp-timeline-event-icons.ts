import {
  Ban,
  Crosshair,
  HeartPulse,
  Shield,
  ShieldCheck,
  ShieldOff,
  Snowflake,
  Swords,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { BattleHpTimelineLayerKey } from "./battle-hp-timeline-layers";

export const battleHpTimelineEventIconByKey: Record<
  BattleHpTimelineLayerKey,
  LucideIcon
> = {
  legendary: Zap,
  stun: Ban,
  freeze: Snowflake,
  counter: Swords,
  evade: ShieldOff,
  parry: ShieldCheck,
  arrowBlock: Shield,
  pierceBlock: Crosshair,
  activeHealing: HeartPulse,
  combo: Swords,
};
