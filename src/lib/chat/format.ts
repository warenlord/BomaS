import type { UIMessage } from "ai";
import type { Database } from "@/lib/types/database.types";

export interface Citation {
  /** Position parmi les extraits fournis au modèle pour ce message (correspond au "(Extrait n)" cité dans la réponse). */
  index: number;
  excerpt: string;
  documentId: string;
  documentTitle: string;
  /** Index du chunk au sein de SON document, pour le retrouver dans le panneau document. */
  chunkIndex: number;
}

export type ChatMessageMetadata = {
  citations?: Citation[];
};

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

type DbMessage = Database["public"]["Tables"]["messages"]["Row"];

export function toUIMessages(messages: DbMessage[]): ChatUIMessage[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      metadata: { citations: (m.citations as Citation[] | null) ?? undefined },
      parts: [{ type: "text", text: m.content }],
    }));
}

export function extractText(message: ChatUIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}
