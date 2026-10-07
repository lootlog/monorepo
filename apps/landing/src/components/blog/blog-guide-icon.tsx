import { Bell, Keyboard, Timer, type LucideProps } from "lucide-react";
import type { BlogPost } from "../../config/blog";

const guideIcons = { timers: Timer, notifications: Bell, windows: Keyboard };

export function BlogGuideIcon({
  guide,
  ...props
}: LucideProps & { guide: BlogPost["key"] }) {
  const Icon = guideIcons[guide];

  return <Icon aria-hidden="true" {...props} />;
}
