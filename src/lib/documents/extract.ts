import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import type { DocumentFileType } from "@/lib/types/database.types";

export interface ExtractedDocument {
  text: string;
  pageCount: number | null;
}

/**
 * Extraction de texte brut à partir d'un buffer PDF ou DOCX.
 * Doit être appelé depuis une route en runtime Node.js (pas Edge).
 */
export async function extractText(buffer: Buffer, fileType: DocumentFileType): Promise<ExtractedDocument> {
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text, pageCount: result.total ?? null };
    } finally {
      await parser.destroy();
    }
  }

  const { value } = await mammoth.extractRawText({ buffer });
  return { text: value, pageCount: null };
}
