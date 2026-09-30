export async function writeSitemap(outputPath, urls) {
  const entries = urls.map((url) => {
    const location = url
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");

    return `  <url><loc>${location}</loc></url>`;
  });

  await Bun.write(
    outputPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`,
  );
}
