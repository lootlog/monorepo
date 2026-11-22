export async function copyChatText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}
