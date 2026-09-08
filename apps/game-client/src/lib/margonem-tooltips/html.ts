const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeTooltipHtml(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => {
    // SAFETY: The replacement pattern matches exactly the five keys declared in HTML_ESCAPE_MAP.
    return HTML_ESCAPE_MAP[char as keyof typeof HTML_ESCAPE_MAP];
  });
}
