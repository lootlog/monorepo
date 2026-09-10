export async function copyChatText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard permissions can deny this action; keep the interaction silent.
  }
}
