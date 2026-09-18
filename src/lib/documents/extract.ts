import { getDocumentProxy, extractText as extractPdfText } from "unpdf";
import mammoth from "mammoth";
import type { DocumentFileType } from "@/lib/types/database.types";

export interface ExtractedDocument {
  text: string;
  pageCount: number | null;
}

/**
 * Extraction de texte brut à partir d'un buffer PDF ou DOCX.
 * Doit être appelé depuis une route en runtime Node.js (pas Edge).
 *
 * Utilise `unpdf` plutôt que `pdf-parse` : ce dernier embarque `pdfjs-dist`
 * dans sa variante navigateur (référence `DOMMatrix`), ce qui plante les
 * fonctions serverless Vercel. `unpdf` fournit une build de PDF.js dédiée
 * aux environnements serverless/edge, sans dépendance aux API du navigateur.
 */
export async function extractText(buffer: Buffer, fileType: DocumentFileType): Promise<ExtractedDocument> {
  if (fileType === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractPdfText(pdf, { mergePages: true });
    return { text, pageCount: totalPages };
  }

  const { value } = await mammoth.extractRawText({ buffer });
  return { text: value, pageCount: null };
}
