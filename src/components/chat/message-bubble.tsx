import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";
import type { ChatUIMessage } from "@/lib/chat/format";

export function MessageBubble({ message }: { message: ChatUIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const citations = message.metadata?.citations ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        ) : text ? (
          <Markdown>{text}</Markdown>
        ) : (
          <span className="flex gap-1 py-1">
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
          </span>
        )}

        {citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
            {citations.map((c) => (
              <span
                key={c.chunkIndex}
                title={c.excerpt}
                className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                <FileText className="size-3" />
                Extrait {c.chunkIndex + 1}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
