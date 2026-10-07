import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { Bell, Keyboard, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BlogPost } from "../../config/blog";

const guideIcons = { timers: Timer, notifications: Bell, windows: Keyboard };

export function BlogGuideCard({ post }: { post: BlogPost }) {
  const { t } = useTranslation();
  const Icon = guideIcons[post.key];

  return (
    <ChevronLink
      className="blog-guide-card focus-visible:ring-0 focus-visible:ring-offset-0"
      aria-label={post.title}
      render={<Link to="/blog/$slug" params={{ slug: post.slug }} />}
    >
      <div className="blog-guide-preview" aria-hidden="true">
        <img
          src={post.preview}
          width={post.previewWidth}
          height={post.previewHeight}
          alt=""
        />
      </div>
      <div className="blog-guide-copy">
        <Icon
          className="blog-guide-icon"
          size={20}
          strokeWidth={2}
          aria-hidden="true"
        />
        <h2>{post.title}</h2>
        <p>{post.description}</p>
        <span className="blog-guide-read">{t("landing.blog.read")}</span>
      </div>
    </ChevronLink>
  );
}
