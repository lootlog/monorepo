const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeTooltipHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
