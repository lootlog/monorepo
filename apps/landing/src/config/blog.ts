import translations from "../i18n/translations/landing.json" with { type: "json" };

export const blogPosts = (
  [
    {
      slug: "timery-zawsze-widoczne",
      key: "timers",
      preview: "/screenshots/guides/timer-menu.jpg",
      previewWidth: 196,
      previewHeight: 344,
    },
    {
      slug: "ustawienia-powiadomien",
      key: "notifications",
      preview: "/screenshots/guides/powiadomienia.jpg",
      previewWidth: 820,
      previewHeight: 560,
    },
    {
      slug: "okna-i-skroty-klawiszowe",
      key: "windows",
      preview: "/screenshots/guides/skroty-klawiszowe.jpg",
      previewWidth: 820,
      previewHeight: 560,
    },
  ] as const
).map((post) => ({
  ...post,
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
  const image = "https://lootlog.pl/brand/lootlog-icon-512.png";

  return {
    meta: [
      { title: `${title} | Lootlog` },
      { name: "description", content: description },
      { name: "author", content: post?.author ?? translations.blog.author },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: post ? "article" : "website" },
      { property: "og:url", content: `https://lootlog.pl${path}` },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: "Lootlog" },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      ...(post
        ? [
            { property: "article:published_time", content: post.publishedAt },
            { property: "article:modified_time", content: post.updatedAt },
            { property: "article:author", content: post.author },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: `https://lootlog.pl${path}` }],
  };
}
