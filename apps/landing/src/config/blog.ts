import { PUBLIC_SITE_ORIGINS } from "@lootlog/domain/public-sites";
import translations from "../i18n/translations/landing.json" with { type: "json" };
import { landingPageHead } from "./page-head";

export const blogPosts = (
  [
    {
      slug: "timery-zawsze-widoczne",
      key: "timers",
      surface: "lime",
      preview: "/screenshots/guides/timer-menu.jpg",
      previewWidth: 196,
      previewHeight: 344,
    },
    {
      slug: "ustawienia-powiadomien",
      key: "notifications",
      surface: "cyan",
      preview: "/screenshots/guides/powiadomienia.jpg",
      previewWidth: 820,
      previewHeight: 560,
    },
    {
      slug: "okna-i-skroty-klawiszowe",
      key: "windows",
      surface: "amber",
      preview: "/screenshots/guides/skroty-klawiszowe.jpg",
      previewWidth: 820,
      previewHeight: 560,
    },
  ] as const
).map((post, index) => ({
  ...post,
  number: String(index + 1).padStart(2, "0"),
  ...translations.blog.posts[post.key],
  publishedAt: "2026-10-07",
  updatedAt: "2026-10-07",
  author: translations.blog.author,
  path: `/blog/${post.slug}`,
}));

export type BlogPost = (typeof blogPosts)[number];

export const blogNotFoundHead = {
  meta: [
    { title: `${translations.blog.notFoundTitle} | Lootlog` },
    { name: "description", content: translations.blog.notFoundDescription },
    { name: "robots", content: "noindex" },
    { name: "googlebot", content: "noindex" },
  ],
};

export function blogPageHead({
  title,
  description,
  path,
  post,
}: {
  title: string;
  description: string;
  path: string;
  post?: BlogPost;
}) {
  const head = landingPageHead({
    path,
    title,
    documentTitle: `${title} | Lootlog`,
    description,
    type: post ? "article" : "website",
    image: post
      ? {
          url: `${PUBLIC_SITE_ORIGINS.web}${post.preview}`,
          width: post.previewWidth,
          height: post.previewHeight,
          alt: post.title,
        }
      : undefined,
  });

  return {
    ...head,
    meta: [
      ...head.meta,
      { name: "author", content: post?.author ?? translations.blog.author },
      ...(post
        ? [
            { property: "article:published_time", content: post.publishedAt },
            { property: "article:modified_time", content: post.updatedAt },
            { property: "article:author", content: post.author },
          ]
        : []),
    ],
  };
}
