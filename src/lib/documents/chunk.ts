export interface TextChunk {
  index: number;
  content: string;
}

/**
 * Découpe un texte long en segments d'environ `chunkSize` caractères avec un
 * recouvrement de `overlap` caractères, en essayant de couper sur une fin de
 * phrase ou de paragraphe proche de la limite pour préserver le sens.
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 150): TextChunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);

    if (end < cleaned.length) {
      const window = cleaned.slice(start, end);
      const lastBreak = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      if (lastBreak > chunkSize * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const content = cleaned.slice(start, end).trim();
    if (content) {
      chunks.push({ index, content });
      index += 1;
    }

    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
